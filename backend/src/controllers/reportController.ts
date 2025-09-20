import { Response } from 'express';
import { Event, Coupon, CouponRate, MealChoice, Participant } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { Sequelize } from 'sequelize';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

export const getEventSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const user_id = req.user.user_id;

    console.log(`Fetching summary for event ${eventId}, user ${user_id}`);

    const event = await Event.findOne({
      where: {
        event_id: eventId,
        user_id
      }
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Get breakdown by category - simplified approach to avoid GROUP BY issues
    const allCoupons = await Coupon.findAll({
      where: { event_id: eventId },
      include: [
        { model: CouponRate, attributes: ['rate_type', 'price'] },
        { model: MealChoice, attributes: ['meal_type'] }
      ]
    });

    // Process breakdown manually to avoid SQL GROUP BY issues
    const breakdownMap = new Map();
    allCoupons.forEach((coupon: any) => {
      const key = `${coupon.MealChoice?.meal_type || 'Unknown'} - ${coupon.CouponRate?.rate_type || 'Unknown'}`;
      if (!breakdownMap.has(key)) {
        breakdownMap.set(key, {
          category: key,
          count: 0,
          redeemed: 0
        });
      }
      const item = breakdownMap.get(key);
      item.count += coupon.total_count || 0;
      item.redeemed += coupon.consumed_count || 0;
    });

    const breakdown = Array.from(breakdownMap.values());

    // Get total counts
    const totalParticipants = await Participant.count({
      where: { event_id: eventId }
    });

    const totalCouponsBooked = await Coupon.sum('total_count', {
      where: { event_id: eventId }
    });

    const totalCouponsRedeemed = await Coupon.sum('consumed_count', {
      where: { event_id: eventId }
    });

    const pendingCoupons = (totalCouponsBooked || 0) - (totalCouponsRedeemed || 0);

    console.log(`Summary data: participants=${totalParticipants}, booked=${totalCouponsBooked}, redeemed=${totalCouponsRedeemed}`);

    res.json({
      event: {
        name: event.name,
        venue: event.venue,
        start_date: event.start_date,
        end_date: event.end_date
      },
      summary: {
        total_participants: totalParticipants,
        total_coupons_booked: totalCouponsBooked || 0,
        total_coupons_redeemed: totalCouponsRedeemed || 0,
        pending_coupons: pendingCoupons,
        breakdown: breakdown
      }
    });
  } catch (error) {
    console.error('Get event summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportEventReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { format } = req.query;
    const user_id = req.user.user_id;

    const event = await Event.findOne({
      where: {
        event_id: eventId,
        user_id
      }
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // For PDF, get participants with their coupons grouped
    const participants = await Participant.findAll({
      where: { event_id: eventId },
      include: [
        {
          model: Coupon,
          include: [
            { model: CouponRate, attributes: ['rate_type', 'price'] },
            { model: MealChoice, attributes: ['meal_type'] }
          ]
        }
      ],
      order: [['name', 'ASC']]
    });

    // For Excel, get individual coupons
    const coupons = await Coupon.findAll({
      where: { event_id: eventId },
      include: [
        {
          model: Participant,
          attributes: ['name', 'address', 'contact_number']
        },
        {
          model: CouponRate,
          attributes: ['rate_type', 'price']
        },
        {
          model: MealChoice,
          attributes: ['meal_type']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${event.name}-report.pdf"`);

      doc.pipe(res);

      // Header Section
      doc.fontSize(18).text('EVENT REPORT', { align: 'center' });
      doc.moveDown(0.5);

      // Event Details
      doc.fontSize(14).text(`Event: ${event.name}`, { align: 'center' });
      doc.fontSize(10);
      doc.text(`Venue: ${event.venue || 'Not specified'} | Start: ${new Date(event.start_date).toLocaleDateString()} | End: ${new Date(event.end_date).toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(1);

      // Get all unique meal types
      const allMealTypes = [...new Set(
        participants.flatMap((p: any) =>
          (p.Coupons || []).map((c: any) => c.MealChoice?.meal_type).filter(Boolean)
        )
      )];

      if (allMealTypes.length === 0) {
        doc.text('No meal types found for this event.');
        doc.end();
        return;
      }

      // Calculate column layout
      const pageWidth = 595 - 60; // A4 width minus margins
      const fixedColsWidth = 40 + 120 + 80; // S.No + Name + Mobile
      const totalValueWidth = 60;
      const availableForMeals = pageWidth - fixedColsWidth - totalValueWidth;
      const mealColWidth = Math.max(50, Math.floor(availableForMeals / allMealTypes.length));

      // Define columns
      const columns = [
        { header: 'S.No', x: 30, width: 40 },
        { header: 'Participant Name', x: 70, width: 120 },
        { header: 'Mobile No.', x: 190, width: 80 }
      ];

      // Add meal type columns
      let currentX = 270;
      allMealTypes.forEach((mealType) => {
        columns.push({
          header: mealType.length > 8 ? mealType.substring(0, 6) + '..' : mealType,
          x: currentX,
          width: mealColWidth
        });
        currentX += mealColWidth;
      });

      // Add total value column
      columns.push({
        header: 'Total (₹)',
        x: currentX,
        width: totalValueWidth
      });

      const tableWidth = columns[columns.length - 1].x + columns[columns.length - 1].width - 30;
      const rowHeight = 20;
      let currentY = doc.y;

      // Draw table header
      doc.rect(30, currentY, tableWidth, rowHeight).stroke();
      doc.fontSize(8).fillColor('black');

      columns.forEach((col) => {
        if (col.header.includes('..')) {
          // For meal columns, show abbreviated name and (B/R)
          doc.text(col.header, col.x + 2, currentY + 2, { width: col.width - 4 });
          doc.text('(B/R)', col.x + 2, currentY + 12, { width: col.width - 4 });
        } else {
          doc.text(col.header, col.x + 2, currentY + 6, { width: col.width - 4 });
        }
      });

      // Draw vertical lines for header
      columns.forEach((col) => {
        doc.moveTo(col.x, currentY).lineTo(col.x, currentY + rowHeight).stroke();
      });
      doc.moveTo(30 + tableWidth, currentY).lineTo(30 + tableWidth, currentY + rowHeight).stroke();

      currentY += rowHeight;

      // Draw table rows
      participants.forEach((participant, index) => {
        const coupons = (participant as any).Coupons || [];
        const totalValue = coupons.reduce((sum: number, coupon: any) => sum + (coupon.CouponRate?.price || 0) * coupon.total_count, 0);

        // Group coupons by meal type
        const mealCounts: Record<string, { booked: number; redeemed: number }> = {};
        allMealTypes.forEach(mealType => {
          const mealCoupons = coupons.filter((c: any) => c.MealChoice?.meal_type === mealType);
          mealCounts[mealType] = {
            booked: mealCoupons.reduce((sum: number, c: any) => sum + c.total_count, 0),
            redeemed: mealCoupons.reduce((sum: number, c: any) => sum + c.consumed_count, 0)
          };
        });

        // Alternate row background
        if (index % 2 === 1) {
          doc.rect(30, currentY, tableWidth, rowHeight).fillAndStroke('#f8f9fa', '#000000');
        } else {
          doc.rect(30, currentY, tableWidth, rowHeight).stroke();
        }

        doc.fillColor('black').fontSize(8);

        // Fill row data
        let colIndex = 0;

        // S.No
        doc.text((index + 1).toString(), columns[colIndex].x + 2, currentY + 6);
        colIndex++;

        // Participant Name
        doc.text(participant.name || 'N/A', columns[colIndex].x + 2, currentY + 6, { width: columns[colIndex].width - 4 });
        colIndex++;

        // Mobile
        doc.text(participant.contact_number || 'N/A', columns[colIndex].x + 2, currentY + 6);
        colIndex++;

        // Meal columns
        allMealTypes.forEach((mealType) => {
          const counts = mealCounts[mealType];
          const text = (counts.booked > 0 || counts.redeemed > 0)
            ? `${counts.booked}/${counts.redeemed}`
            : '-';
          doc.text(text, columns[colIndex].x + 2, currentY + 6, { width: columns[colIndex].width - 4, align: 'center' });
          colIndex++;
        });

        // Total value
        doc.text(`₹${totalValue.toFixed(0)}`, columns[colIndex].x + 2, currentY + 6);

        // Draw vertical lines for this row
        columns.forEach((col) => {
          doc.moveTo(col.x, currentY).lineTo(col.x, currentY + rowHeight).stroke();
        });
        doc.moveTo(30 + tableWidth, currentY).lineTo(30 + tableWidth, currentY + rowHeight).stroke();

        currentY += rowHeight;

        // Check for new page
        if (currentY > 750) {
          doc.addPage();
          currentY = 50;
        }
      });

      // Summary section
      doc.moveDown(2);
      currentY += 20;
      doc.fontSize(12).text('SUMMARY', 30, currentY);
      currentY += 20;

      const totalParticipants = participants.length;
      const allCoupons = participants.reduce((acc: any[], p: any) => acc.concat((p as any).Coupons || []), []);
      const grandTotal = allCoupons.reduce((sum: number, c: any) => sum + (c.CouponRate?.price || 0) * c.total_count, 0);

      doc.fontSize(10);
      doc.text(`Total Participants: ${totalParticipants}`, 30, currentY);
      currentY += 15;

      // Meal-wise summary
      allMealTypes.forEach((mealType) => {
        const mealCoupons = allCoupons.filter((c: any) => c.MealChoice?.meal_type === mealType);
        const booked = mealCoupons.reduce((sum: number, c: any) => sum + c.total_count, 0);
        const redeemed = mealCoupons.reduce((sum: number, c: any) => sum + c.consumed_count, 0);
        doc.text(`${mealType}: ${booked} booked, ${redeemed} redeemed`, 30, currentY);
        currentY += 12;
      });

      currentY += 10;
      doc.text(`Grand Total Value: ₹${grandTotal.toFixed(2)}`, 30, currentY);

      // Footer
      doc.fontSize(8).text(`Generated: ${new Date().toLocaleString()}`, 30, 780);
      doc.text('Powered by Festify', 500, 780);

      doc.end();
    } else {
      // Excel export
      const worksheetData = [
        ['Participant Name', 'Address', 'Contact', 'Meal Type', 'Rate Type', 'Price', 'Status', 'Consumed Count', 'Total Count', 'QR Code']
      ];

      coupons.forEach(coupon => {
        worksheetData.push([
          // @ts-ignore
          coupon.Participant?.name || '',
          // @ts-ignore
          coupon.Participant?.address || '',
          // @ts-ignore
          coupon.Participant?.contact_number || '',
          // @ts-ignore
          coupon.MealChoice?.meal_type || '',
          // @ts-ignore
          coupon.CouponRate?.rate_type || '',
          // @ts-ignore
          coupon.CouponRate?.price || 0,
          coupon.status,
          coupon.consumed_count.toString(),
          coupon.total_count.toString(),
          coupon.qr_code_value
        ]);
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Coupon Report');

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${event.name}-report.xlsx"`);
      res.send(excelBuffer);
    }
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};