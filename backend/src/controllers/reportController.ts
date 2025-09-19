import { Response } from 'express';
import { Event, Coupon, CouponRate, MealChoice, Participant } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { Sequelize } from 'sequelize';
import PDFDocument from 'pdfkit';

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
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${event.name}-report.pdf"`);

      doc.pipe(res);

      doc.fontSize(16).text(`Event Report: ${event.name}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Venue: ${event.venue || 'TBA'}`);
      doc.text(`Start Date: ${new Date(event.start_date).toLocaleDateString()}`);
      doc.text(`End Date: ${new Date(event.end_date).toLocaleDateString()}`);
      doc.moveDown();

      doc.text('Coupon Details:', { underline: true });
      doc.moveDown();

      coupons.forEach((coupon, index) => {
        // @ts-ignore
        doc.text(`${index + 1}. ${coupon.Participant?.name}`);
        // @ts-ignore
        doc.text(`   Meal: ${coupon.MealChoice?.meal_type}`);
        // @ts-ignore
        doc.text(`   Type: ${coupon.CouponRate?.rate_type} (₹${coupon.CouponRate?.price})`);
        doc.text(`   Status: ${coupon.status} (${coupon.consumed_count}/${coupon.total_count})`);
        doc.text(`   QR Code: ${coupon.qr_code_value}`);
        doc.moveDown(0.5);
      });

      doc.end();
    } else {
      const csvData = [
        'Participant Name,Address,Contact,Meal Type,Rate Type,Price,Status,Consumed Count,Total Count,QR Code'
      ];

      coupons.forEach(coupon => {
        csvData.push([
          // @ts-ignore
          coupon.Participant?.name,
          // @ts-ignore
          coupon.Participant?.address || '',
          // @ts-ignore
          coupon.Participant?.contact_number || '',
          // @ts-ignore
          coupon.MealChoice?.meal_type,
          // @ts-ignore
          coupon.CouponRate?.rate_type,
          // @ts-ignore
          coupon.CouponRate?.price,
          coupon.status,
          coupon.consumed_count,
          coupon.total_count,
          coupon.qr_code_value
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${event.name}-report.csv"`);
      res.send(csvData.join('\n'));
    }
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};