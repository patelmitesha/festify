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

    for (const coupon of participant.Coupons) {
      try {
        const qrCodeDataURL = await generateQRCode(coupon.qr_code_value);
        const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');

        doc.fontSize(12).text(`Coupon ID: ${coupon.qr_code_value}`);
        doc.text(`Meal: ${coupon.MealChoice.meal_type}`);
        doc.text(`Type: ${coupon.CouponRate.rate_type} (₹${coupon.CouponRate.price})`);
        doc.text(`Status: ${coupon.status}`);

        doc.image(qrCodeBuffer, doc.x, doc.y, { width: 100, height: 100 });
        doc.moveDown(8);
      } catch (qrError) {
        console.error('QR generation error:', qrError);
        doc.text(`QR Code generation failed for coupon ${coupon.coupon_id}`);
        doc.moveDown();
      }
    }

    doc.end();
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
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