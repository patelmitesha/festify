import { Response } from 'express';
import { Event, Participant, Coupon, CouponRate, MealChoice } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateCouponId, generateQRCode } from '../utils/qr';
import PDFDocument from 'pdfkit';

export const addParticipant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { name, address, contact_number, coupon_bookings } = req.body;
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

    if (!name ) {
      res.status(400).json({
        error: 'Name and coupon bookings are required',
        
      });
      return;
    }

    const participant = await Participant.create({
      event_id: parseInt(eventId),
      name,
      address,
      contact_number,
    });

    const coupons = [];
    for (const booking of coupon_bookings) {
      for (let i = 0; i < booking.quantity; i++) {
        const qrCodeValue = generateCouponId();
        const qrCodeLink = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/coupons/view/${qrCodeValue}`;

        const coupon = await Coupon.create({
          participant_id: participant.participant_id,
          event_id: parseInt(eventId),
          rate_id: booking.rate_id,
          meal_id: booking.meal_id,
          qr_code_value: qrCodeValue,
          qr_code_link: qrCodeLink,
          status: 'Booked',
          consumed_count: 0,
          total_count: 1,
        });

        coupons.push(coupon);
      }
    }

    const participantWithCoupons = await Participant.findByPk(participant.participant_id, {
      include: [{
        model: Coupon,
        include: [
          { model: CouponRate },
          { model: MealChoice }
        ]
      }]
    });

    res.status(201).json({
      message: 'Participant added successfully',
      participant: participantWithCoupons,
      couponsGenerated: coupons.length,
    });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEventParticipants = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const participants = await Participant.findAll({
      where: { event_id: eventId },
      include: [{
        model: Coupon,
        include: [
          { model: CouponRate },
          { model: MealChoice }
        ]
      }],
      order: [['name', 'ASC']]
    });

    res.json(participants);
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateParticipant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId, participantId } = req.params;
    const { name, address, contact_number } = req.body;
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
      }
    });

    if (!participant) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    await participant.update({
      name: name || participant.name,
      address: address || participant.address,
      contact_number: contact_number || participant.contact_number,
    });

    const updatedParticipant = await Participant.findByPk(participant.participant_id, {
      include: [{
        model: Coupon,
        include: [
          { model: CouponRate },
          { model: MealChoice }
        ]
      }]
    });

    res.json({
      message: 'Participant updated successfully',
      participant: updatedParticipant,
    });
  } catch (error) {
    console.error('Update participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteParticipant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      }
    });

    if (!participant) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    await participant.destroy();

    res.json({ message: 'Participant deleted successfully' });
  } catch (error) {
    console.error('Delete participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const searchParticipantsByPhone = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { phone } = req.query;
    const user_id = req.user.user_id;

    if (!phone) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

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

    const participants = await Participant.findAll({
      where: {
        event_id: eventId,
        contact_number: {
          [require('sequelize').Op.like]: `%${phone}%`
        }
      },
      include: [{
        model: Coupon,
        include: [
          { model: CouponRate },
          { model: MealChoice }
        ]
      }],
      order: [['name', 'ASC']]
    });

    res.json(participants);
  } catch (error) {
    console.error('Search participants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const generateParticipantMobilePDF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId, participantId } = req.params;
    const user_id = req.user.user_id;

    // Verify event ownership
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

    // Get participant with coupons
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

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="participant-${participant.name.replace(/\s+/g, '-')}-mobile-qr.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).text('FESTIFY - PARTICIPANT DETAILS', { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(event.name, { align: 'center' });
    doc.moveDown(2);

    // Participant Info
    doc.fontSize(16).text('PARTICIPANT INFORMATION', { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Name: ${participant.name}`);
    if (participant.address) {
      doc.text(`Address: ${participant.address}`);
    }
    if (participant.contact_number) {
      doc.text(`Contact: ${participant.contact_number}`);
    }
    doc.moveDown();

    // Mobile Number QR Code
    if (participant.contact_number) {
      doc.fontSize(14).text('MOBILE NUMBER QR CODE', { underline: true });
      doc.moveDown();

      try {
        const mobileQRData = await generateQRCode(participant.contact_number);
        const mobileQRBuffer = Buffer.from(mobileQRData.split(',')[1], 'base64');
        doc.image(mobileQRBuffer, {
          fit: [150, 150],
          align: 'center'
        });
        doc.moveDown();
        doc.fontSize(10).text(`Mobile: ${participant.contact_number}`, { align: 'center' });
        doc.moveDown(2);
      } catch (qrError) {
        console.error('Error generating mobile QR code:', qrError);
        doc.fontSize(10).text('Error generating mobile QR code', { align: 'center' });
        doc.moveDown();
      }
    }

    // Coupon Details
    doc.fontSize(14).text('COUPON BOOKINGS', { underline: true });
    doc.moveDown();

    if (participant.Coupons && participant.Coupons.length > 0) {
      for (let i = 0; i < participant.Coupons.length; i++) {
        const coupon = participant.Coupons[i];

        // Add page break if needed (except for first coupon)
        if (i > 0 && i % 2 === 0) {
          doc.addPage();
        }

        doc.fontSize(12);
        doc.text(`Coupon #${i + 1}`, { underline: true });
        doc.text(`Meal: ${(coupon as any).MealChoice?.meal_type || 'Not specified'}`);
        doc.text(`Rate: ${(coupon as any).CouponRate?.rate_type || 'Unknown'} - ₹${(coupon as any).CouponRate?.price || 0}`);
        doc.text(`Status: ${coupon.status}`);
        doc.text(`Usage: ${coupon.consumed_count}/${coupon.total_count}`);
        doc.moveDown();

        // Coupon QR Code
        try {
          const couponQRData = await generateQRCode(coupon.qr_code_value);
          const couponQRBuffer = Buffer.from(couponQRData.split(',')[1], 'base64');
          doc.image(couponQRBuffer, {
            fit: [120, 120],
            align: 'center'
          });
          doc.moveDown();
          doc.fontSize(8).text(`Coupon Code: ${coupon.qr_code_value}`, { align: 'center' });
          doc.moveDown();
        } catch (qrError) {
          console.error('Error generating coupon QR code:', qrError);
          doc.fontSize(8).text('Error generating coupon QR code', { align: 'center' });
          doc.moveDown();
        }
      }
    } else {
      doc.fontSize(12).text('No coupons booked for this participant.');
    }

    // Event Details
    doc.addPage();
    doc.fontSize(14).text('EVENT DETAILS', { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Venue: ${event.venue || 'TBA'}`);
    doc.text(`Start Date: ${event.start_date ? new Date(event.start_date).toLocaleDateString() : 'TBA'}`);
    doc.text(`End Date: ${event.end_date ? new Date(event.end_date).toLocaleDateString() : 'TBA'}`);
    doc.moveDown();

    // Footer
    doc.fontSize(8).text('Generated by Festify', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Generate participant mobile PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};