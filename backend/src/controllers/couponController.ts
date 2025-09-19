import { Response } from 'express';
import { Coupon, Event, Participant, CouponRate, MealChoice, Redemption } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateQRCode } from '../utils/qr';
import PDFDocument from 'pdfkit';

export const getCouponByQR = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    res.setHeader('Content-Disposition', `attachment; filename="festify-coupon-${coupon.coupon_id}.pdf"`);

    doc.pipe(res);

    doc.fontSize(24).text('FESTIFY COUPON', { align: 'center' });
    doc.moveDown();

    doc.fontSize(18).text(coupon.Event?.name || 'Event', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Participant: ${coupon.Participant?.name || 'Unknown'}`);
    doc.text(`Meal: ${(coupon as any).MealChoice?.meal_type || 'Not specified'}`);
    doc.text(`Price: $${(coupon as any).CouponRate?.price || 0}`);
    doc.text(`Status: ${coupon.status}`);
    doc.moveDown();

    doc.text('EVENT DETAILS');
    doc.text(`Venue: ${coupon.Event?.venue || 'TBA'}`);
    doc.text(`Date: ${coupon.Event?.start_date ? new Date(coupon.Event.start_date).toLocaleDateString() : 'TBA'}`);
    doc.moveDown();

    const qrCodeData = await generateQRCode(coupon.qr_code_value);
    const qrImageBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64');
    doc.image(qrImageBuffer, {
      fit: [150, 150],
      align: 'center'
    });

    doc.moveDown();
    doc.fontSize(10).text(`QR Code: ${coupon.qr_code_value}`, { align: 'center' });

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
      order: [['created_at', 'DESC']]
    });

    res.json({ coupons });
  } catch (error) {
    console.error('Get event coupons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};