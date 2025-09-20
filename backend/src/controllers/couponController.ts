import { Response } from 'express';
import { Coupon, Event, Participant, CouponRate, MealChoice, Redemption, User, EventRepresentative } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateQRCode } from '../utils/qr';
import PDFDocument from 'pdfkit';

// Helper function to check if user has access to event
const checkEventAccess = async (eventId: string, userId: number) => {
  // Get user to check their role
  const user = await User.findByPk(userId);
  if (!user) {
    return null;
  }

  let event = null;

  // If user is a manager, check if they own the event
  if ((user as any).role === 'manager') {
    event = await Event.findOne({
      where: {
        event_id: eventId,
        user_id: userId
      }
    });
  }

  // If user is a representative, check if they're assigned to this event
  if ((user as any).role === 'representative') {
    const assignment = await EventRepresentative.findOne({
      where: { event_id: eventId, user_id: userId },
      include: [{
        model: Event
      }]
    });

    if (assignment) {
      event = (assignment as any).Event;
    }
  }

  return event;
};

export const getCouponByQR = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { qrCode } = req.params;

    // First, try to find coupon by QR code value (existing behavior)
    let coupon = await Coupon.findOne({
      where: { qr_code_value: qrCode },
      include: [
        {
          model: Event,
          attributes: ['name', 'venue', 'start_date', 'end_date']
        },
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
      ]
    });

    // If not found and the input looks like a phone number, search by phone
    if (!coupon && /^\d{10,15}$/.test(qrCode)) {
      const participant = await Participant.findOne({
        where: {
          contact_number: {
            [require('sequelize').Op.like]: `%${qrCode}%`
          }
        },
        include: [{
          model: Coupon,
          include: [
            {
              model: Event,
              attributes: ['name', 'venue', 'start_date', 'end_date']
            },
            {
              model: CouponRate,
              attributes: ['rate_type', 'price']
            },
            {
              model: MealChoice,
              attributes: ['meal_type']
            }
          ]
        }]
      });

      // If participant found and has coupons, return the first coupon
      if (participant && (participant as any).Coupons && (participant as any).Coupons.length > 0) {
        coupon = (participant as any).Coupons[0];
        // The coupon should already have Event, CouponRate, and MealChoice included
        // We need to add the Participant info manually since it's not included in the coupon query
        const couponData = (coupon as any)?.dataValues ? (coupon as any).dataValues : coupon;
        coupon = {
          ...couponData,
          Participant: {
            name: participant.name,
            address: participant.address,
            contact_number: participant.contact_number
          } as any
        } as any;
      }
    }

    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }

    res.json({ coupon });
  } catch (error) {
    console.error('Get coupon by QR error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const generateCouponPDF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId, participantId } = req.params;
    const user_id = req.user.user_id;

    const event = await checkEventAccess(eventId, user_id);

    if (!event) {
      res.status(404).json({ error: 'Event not found or access denied' });
      return;
    }

    const participant = await Participant.findOne({
      where: {
        participant_id: participantId,
        event_id: eventId
      },
      include: [{
        model: Coupon,
        include: [
          { model: CouponRate },
          { model: MealChoice }
        ]
      }]
    });

    if (!participant) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${participant.name}-coupons.pdf"`);

    doc.pipe(res);

    doc.fontSize(16).text(`Event: ${event.name}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Participant: ${participant.name}`);
    doc.text(`Venue: ${event.venue || 'TBA'}`);
    doc.text(`Date: ${new Date(event.start_date).toLocaleDateString()}`);
    doc.moveDown();

    // @ts-ignore
    if (participant.Coupons) {
      // @ts-ignore
      for (const coupon of participant.Coupons) {
        try {
          // @ts-ignore
          const qrCodeDataURL = await generateQRCode(coupon.qr_code_value);
          const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');

          // @ts-ignore
          doc.fontSize(12).text(`Coupon ID: ${coupon.qr_code_value}`);
          // @ts-ignore
          doc.text(`Meal: ${coupon.MealChoice?.meal_type || 'N/A'}`);
          // @ts-ignore
          doc.text(`Type: ${coupon.CouponRate?.rate_type || 'N/A'} (₹${coupon.CouponRate?.price || 0})`);
          // @ts-ignore
          doc.text(`Status: ${coupon.status}`);

          doc.image(qrCodeBuffer, doc.x, doc.y, { width: 100, height: 100 });
          doc.moveDown(8);
        } catch (qrError) {
          console.error('QR generation error:', qrError);
          // @ts-ignore
          doc.text(`QR Code generation failed for coupon ${coupon.coupon_id}`);
          doc.moveDown();
        }
      }
    }

    doc.end();
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCouponDataByQR = async (req: any, res: Response): Promise<void> => {
  try {
    const { qrCode } = req.params;

    const coupon = await Coupon.findOne({
      where: { qr_code_value: qrCode },
      include: [
        {
          model: Event,
          attributes: ['name', 'venue', 'start_date', 'end_date']
        },
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
      ]
    });

    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }

    const qrCodeImage = await generateQRCode(coupon.qr_code_value);

    res.json({
      coupon: {
        coupon_id: coupon.coupon_id,
        qr_code_value: coupon.qr_code_value,
        qr_code_image: qrCodeImage,
        status: coupon.status,
        consumed_count: coupon.consumed_count,
        total_count: coupon.total_count,
        created_at: coupon.created_at,
        Event: coupon.Event,
        Participant: coupon.Participant,
        CouponRate: coupon.CouponRate,
        MealChoice: coupon.MealChoice
      }
    });
  } catch (error) {
    console.error('Error fetching coupon data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const viewCouponByQR = async (req: any, res: Response): Promise<void> => {
  try {
    const { qrCode } = req.params;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    res.redirect(`${frontendUrl}/coupon/${qrCode}`);
  } catch (error) {
    console.error('Error redirecting to coupon view:', error);
    res.status(500).send('Error loading coupon');
  }
};

export const generateSingleCouponPDF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { couponId } = req.params;
    const user_id = req.user.user_id;

    const coupon = await Coupon.findOne({
      where: { coupon_id: couponId },
      include: [
        {
          model: Event,
          where: { user_id },
          attributes: ['name', 'venue', 'start_date', 'end_date']
        },
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
      ]
    });

    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="festify-coupon-${coupon.Participant?.name?.replace(/\s+/g, '-') || 'coupon'}.pdf"`);

    doc.pipe(res);

    // Header Section - Purple gradient-like design
    const pageWidth = doc.page.width;
    const headerHeight = 80;

    // Background rectangle for header
    doc.rect(0, 0, pageWidth, headerHeight)
       .fillAndStroke('#6366f1', '#4f46e5');

    // Reset fill color and add header text
    doc.fillColor('white');
    doc.fontSize(28).text('FESTIFY COUPON', 50, 25, { align: 'center', width: pageWidth - 100 });
    doc.fontSize(18).text(coupon.Event?.name || 'Event', 50, 50, { align: 'center', width: pageWidth - 100 });

    // Reset position and color for content
    doc.y = headerHeight + 30;
    doc.fillColor('#1f2937');

    // Coupon Information Card
    const cardY = doc.y;
    const cardHeight = 120;
    doc.rect(50, cardY, pageWidth - 100, cardHeight)
       .fillAndStroke('#f9fafb', '#e5e7eb');

    // Add left border accent
    doc.rect(50, cardY, 4, cardHeight).fill('#6366f1');

    // Coupon Details Content
    doc.fillColor('#374151');
    doc.fontSize(14).text('Participant:', 70, cardY + 15);
    doc.fontSize(12).text(coupon.Participant?.name || 'Unknown', 150, cardY + 15);

    doc.fontSize(14).text('Meal Type:', 70, cardY + 35);
    doc.fontSize(12).text((coupon as any).MealChoice?.meal_type || 'Not specified', 150, cardY + 35);

    doc.fontSize(14).text('Rate Type:', 70, cardY + 55);
    doc.fontSize(12).text((coupon as any).CouponRate?.rate_type || 'Unknown', 150, cardY + 55);

    doc.fontSize(14).text('Price:', 70, cardY + 75);
    doc.fontSize(12).fillColor('#059669').text(`Rs ${(coupon as any).CouponRate?.price || 0}`, 150, cardY + 75);

    doc.fillColor('#374151');
    doc.fontSize(14).text('Status:', 70, cardY + 95);
    const statusColor = coupon.status === 'Booked' ? '#059669' : coupon.status === 'Partial' ? '#d97706' : '#dc2626';
    doc.fontSize(12).fillColor(statusColor).text(coupon.status === 'Booked' ? 'Available' : coupon.status === 'Partial' ? 'Partially Used' : 'Fully Used', 150, cardY + 95);

    // Event Details Card
    doc.y = cardY + cardHeight + 20;
    const eventCardY = doc.y;
    const eventCardHeight = 80;
    doc.rect(50, eventCardY, pageWidth - 100, eventCardHeight)
       .fillAndStroke('#f9fafb', '#e5e7eb');

    // Add left border accent
    doc.rect(50, eventCardY, 4, eventCardHeight).fill('#6366f1');

    // Event Details Content
    doc.fillColor('#374151');
    doc.fontSize(14).text('Venue:', 70, eventCardY + 15);
    doc.fontSize(12).text(coupon.Event?.venue || 'TBA', 150, eventCardY + 15);

    doc.fontSize(14).text('Date:', 70, eventCardY + 35);
    const eventDate = coupon.Event?.start_date ? new Date(coupon.Event.start_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'TBA';
    doc.fontSize(12).text(eventDate, 150, eventCardY + 35);

    // QR Code Section
    doc.y = eventCardY + eventCardHeight + 30;
    doc.fillColor('#1f2937');
    doc.fontSize(16).text('QR Code', { align: 'center' });
    doc.moveDown();

    try {
      const qrCodeData = await generateQRCode(coupon.qr_code_value);
      const qrImageBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64');

      // QR Code background card
      const qrCardY = doc.y;
      const qrCardSize = 220;
      const qrCardX = (pageWidth - qrCardSize) / 2;

      // White background for QR code
      doc.rect(qrCardX, qrCardY, qrCardSize, qrCardSize)
         .fillAndStroke('#ffffff', '#e5e7eb');

      // QR Code itself
      const qrSize = 180;
      const qrX = qrCardX + (qrCardSize - qrSize) / 2;
      const qrY = qrCardY + 20;

      doc.image(qrImageBuffer, qrX, qrY, {
        fit: [qrSize, qrSize]
      });

      // Position after QR card
      doc.y = qrCardY + qrCardSize + 15;

      doc.fontSize(10).fillColor('#6b7280').text(`Code: ${coupon.qr_code_value}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).fillColor('#6b7280').text('Present this coupon for meal redemption', { align: 'center' });
    } catch (qrError) {
      console.error('Error generating QR code:', qrError);
      doc.fontSize(12).fillColor('#ef4444').text('Error generating QR code', { align: 'center' });
    }

    // Footer
    doc.y = doc.page.height - 80;
    doc.fontSize(8).fillColor('#9ca3af').text('Powered by Festify', { align: 'center' });
    doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Single coupon PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

export const getEventCoupons = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const user_id = req.user.user_id;

    const event = await checkEventAccess(eventId, user_id);

    if (!event) {
      res.status(404).json({ error: 'Event not found or access denied' });
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
      order: [['created_at', 'DESC']]
    });

    res.json({ coupons });
  } catch (error) {
    console.error('Get event coupons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCoupon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { couponId } = req.params;
    const user_id = req.user.user_id;

    // Find the coupon and verify access through event ownership
    const coupon = await Coupon.findOne({
      where: { coupon_id: couponId },
      include: [
        {
          model: Event,
          attributes: ['event_id', 'user_id', 'name']
        },
        {
          model: Participant,
          attributes: ['participant_id', 'name']
        }
      ]
    });

    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }

    // Check if user has access to this coupon through event ownership or representative role
    const event = await checkEventAccess(coupon.event_id.toString(), user_id);
    if (!event) {
      res.status(403).json({ error: 'Access denied - you do not have permission to delete this coupon' });
      return;
    }

    // Check if coupon has been consumed
    if (coupon.consumed_count > 0) {
      res.status(400).json({
        error: 'Cannot delete coupon that has been partially or fully consumed',
        consumed_count: coupon.consumed_count,
        total_count: coupon.total_count
      });
      return;
    }

    // Delete the coupon
    await coupon.destroy();

    res.json({
      message: 'Coupon deleted successfully',
      deleted_coupon: {
        coupon_id: coupon.coupon_id,
        participant_name: coupon.Participant?.name,
        event_name: (coupon as any).Event?.name
      }
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};