import { Response } from 'express';
import { Event, Participant, Coupon, CouponRate, MealChoice, User, EventRepresentative, Redemption } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateCouponId, generateQRCode } from '../utils/qr';
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

export const addParticipant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { name, address, contact_number, coupon_bookings } = req.body;
    const user_id = req.user.user_id;

    const event = await checkEventAccess(eventId, user_id);

    if (!event) {
      res.status(404).json({ error: 'Event not found or access denied' });
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

    // Calculate event duration for total_count
    const eventStartDate = new Date(event.start_date);
    const eventEndDate = new Date(event.end_date);
    const eventDurationDays = Math.ceil((eventEndDate.getTime() - eventStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

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
          total_count: eventDurationDays,
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

    console.log(`[DEBUG] getEventParticipants called for eventId=${eventId}, userId=${user_id}`);

    const event = await checkEventAccess(eventId, user_id);

    console.log(`[DEBUG] checkEventAccess result:`, event ? 'FOUND' : 'NOT FOUND');
    if (event) {
      console.log(`[DEBUG] Event details:`, {
        event_id: event.event_id,
        name: event.name,
        user_id: event.user_id
      });
    }

    if (!event) {
      console.log(`[DEBUG] Access denied for user ${user_id} to event ${eventId}`);
      res.status(404).json({ error: 'Event not found or access denied' });
      return;
    }

    console.log(`[DEBUG] Fetching participants for event ${eventId}`);
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

    console.log(`[DEBUG] Found ${participants.length} participants`);
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

    const event = await checkEventAccess(eventId, user_id);

    if (!event) {
      res.status(404).json({ error: 'Event not found or access denied' });
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

    const event = await checkEventAccess(eventId, user_id);

    if (!event) {
      res.status(404).json({ error: 'Event not found or access denied' });
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

    const event = await checkEventAccess(eventId, user_id);

    if (!event) {
      res.status(404).json({ error: 'Event not found or access denied' });
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

    // Add today's redemption status to each coupon
    const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD

    const participantsWithTodayStatus = await Promise.all(participants.map(async (participant) => {
      const participantData = participant.toJSON() as any;

      if (participantData.Coupons) {
        participantData.Coupons = await Promise.all(participantData.Coupons.map(async (coupon: any) => {
          // Check if this coupon has been redeemed today
          const todayRedemption = await Redemption.findOne({
            where: {
              coupon_id: coupon.coupon_id,
              redemption_date: today
            }
          });

          // Check if today is within the event's date range
          const eventStartDate = event.start_date ? new Date(event.start_date).toISOString().split('T')[0] : today;
          const eventEndDate = event.end_date ? new Date(event.end_date).toISOString().split('T')[0] : today;
          const isWithinEventDates = today >= eventStartDate && today <= eventEndDate;

          return {
            ...coupon,
            today_redeemed: !!todayRedemption,
            today_redemption_date: today,
            can_redeem_today: !todayRedemption && coupon.status !== 'Consumed' && isWithinEventDates,
            event_start_date: eventStartDate,
            event_end_date: eventEndDate,
            is_within_event_dates: isWithinEventDates
          };
        }));
      }

      return participantData;
    }));

    res.json(participantsWithTodayStatus);
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
    const event = await checkEventAccess(eventId, user_id);

    if (!event) {
      res.status(404).json({ error: 'Event not found or access denied' });
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
    res.setHeader('Content-Disposition', `attachment; filename="participant-${participant.name.replace(/\s+/g, '-')}-details.pdf"`);

    doc.pipe(res);

    // Header Section - Purple gradient design
    const pageWidth = doc.page.width;
    const headerHeight = 80;

    // Background rectangle for header
    doc.rect(0, 0, pageWidth, headerHeight)
       .fillAndStroke('#6366f1', '#4f46e5');

    // Header text
    doc.fillColor('white');
    doc.fontSize(28).text('FESTIFY - PARTICIPANT DETAILS', 50, 20, { align: 'center', width: pageWidth - 100 });
    doc.fontSize(18).text(event.name, 50, 50, { align: 'center', width: pageWidth - 100 });

    // Reset position and color for content
    doc.y = headerHeight + 30;
    doc.fillColor('#1f2937');

    // Participant Information Card
    const participantCardY = doc.y;
    const participantCardHeight = participant.address ? 100 : 80;
    doc.rect(50, participantCardY, pageWidth - 100, participantCardHeight)
       .fillAndStroke('#f9fafb', '#e5e7eb');

    // Add left border accent
    doc.rect(50, participantCardY, 4, participantCardHeight).fill('#6366f1');

    // Participant Details Content
    doc.fillColor('#1f2937');
    doc.fontSize(16).text('PARTICIPANT INFORMATION', 70, participantCardY + 15);
    doc.fillColor('#374151');
    doc.fontSize(12).text(`Name: ${participant.name}`, 70, participantCardY + 35);
    if (participant.address) {
      doc.text(`Address: ${participant.address}`, 70, participantCardY + 50);
    }
    if (participant.contact_number) {
      doc.text(`Contact: ${participant.contact_number}`, 70, participantCardY + (participant.address ? 65 : 50));
    }

    // Mobile Number QR Code Section
    if (participant.contact_number) {
      doc.y = participantCardY + participantCardHeight + 30;
      doc.fillColor('#1f2937');
      doc.fontSize(16).text('MOBILE NUMBER QR CODE', { align: 'center' });
      doc.moveDown();

      try {
        const mobileQRData = await generateQRCode(participant.contact_number);
        const mobileQRBuffer = Buffer.from(mobileQRData.split(',')[1], 'base64');

        // QR Code background card
        const mobileQRCardY = doc.y;
        const qrCardSize = 200;
        const qrCardX = (pageWidth - qrCardSize) / 2;

        // White background for QR code
        doc.rect(qrCardX, mobileQRCardY, qrCardSize, qrCardSize)
           .fillAndStroke('#ffffff', '#e5e7eb');

        // QR Code itself
        const qrSize = 160;
        const qrX = qrCardX + (qrCardSize - qrSize) / 2;
        const qrY = mobileQRCardY + 20;

        doc.image(mobileQRBuffer, qrX, qrY, {
          fit: [qrSize, qrSize]
        });

        // Position after QR card
        doc.y = mobileQRCardY + qrCardSize + 10;
        doc.fontSize(10).fillColor('#6b7280').text(`Mobile: ${participant.contact_number}`, { align: 'center' });
        doc.moveDown(2);
      } catch (qrError) {
        console.error('Error generating mobile QR code:', qrError);
        doc.fontSize(10).fillColor('#ef4444').text('Error generating mobile QR code', { align: 'center' });
        doc.moveDown();
      }
    }

    // Coupon Details Section
    doc.fillColor('#1f2937');
    doc.fontSize(16).text('COUPON BOOKINGS', { align: 'center' });
    doc.moveDown();

    if (participant.Coupons && participant.Coupons.length > 0) {
      for (let i = 0; i < participant.Coupons.length; i++) {
        const coupon = participant.Coupons[i];

        // Add page break if needed (except for first coupon and if there's not enough space)
        if (doc.y > doc.page.height - 300) {
          doc.addPage();
          // Re-add header on new page
          doc.rect(0, 0, pageWidth, headerHeight)
             .fillAndStroke('#6366f1', '#4f46e5');
          doc.fillColor('white');
          doc.fontSize(20).text('FESTIFY - PARTICIPANT DETAILS', 50, 25, { align: 'center', width: pageWidth - 100 });
          doc.y = headerHeight + 30;
        }

        // Coupon Card
        const couponCardY = doc.y;
        const couponCardHeight = 140;
        doc.rect(50, couponCardY, pageWidth - 100, couponCardHeight)
           .fillAndStroke('#f9fafb', '#e5e7eb');

        // Add left border accent
        doc.rect(50, couponCardY, 4, couponCardHeight).fill('#059669');

        // Coupon Details Content
        doc.fillColor('#1f2937');
        doc.fontSize(14).text(`Coupon #${i + 1}`, 70, couponCardY + 15);
        doc.fillColor('#374151');
        doc.fontSize(12).text(`Meal: ${(coupon as any).MealChoice?.meal_type || 'Not specified'}`, 70, couponCardY + 35);
        doc.text(`Rate: ${(coupon as any).CouponRate?.rate_type || 'Unknown'}`, 70, couponCardY + 50);
        doc.fillColor('#059669').text(`Price: Rs ${(coupon as any).CouponRate?.price || 0}`, 70, couponCardY + 65);

        const statusColor = coupon.status === 'Booked' ? '#059669' : coupon.status === 'Partial' ? '#d97706' : '#dc2626';
        doc.fillColor(statusColor).text(`Status: ${coupon.status}`, 70, couponCardY + 80);
        doc.fillColor('#374151').text(`Usage: ${coupon.consumed_count}/${coupon.total_count}`, 70, couponCardY + 95);

        // Coupon QR Code
        try {
          const couponQRData = await generateQRCode(coupon.qr_code_value);
          const couponQRBuffer = Buffer.from(couponQRData.split(',')[1], 'base64');

          // Position QR code on the right side of the card
          const qrSize = 100;
          const qrX = pageWidth - 100 - qrSize - 20;
          const qrY = couponCardY + 20;

          // White background for QR code
          doc.rect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10)
             .fillAndStroke('#ffffff', '#e5e7eb');

          doc.image(couponQRBuffer, qrX, qrY, {
            fit: [qrSize, qrSize]
          });

          doc.fontSize(8).fillColor('#6b7280').text(`Code: ${coupon.qr_code_value.substring(0, 12)}...`, qrX - 10, qrY + qrSize + 5, { width: qrSize + 20, align: 'center' });
        } catch (qrError) {
          console.error('Error generating coupon QR code:', qrError);
          doc.fontSize(8).fillColor('#ef4444').text('QR Error', 400, couponCardY + 50);
        }

        doc.y = couponCardY + couponCardHeight + 20;
      }
    } else {
      doc.fillColor('#6b7280');
      doc.fontSize(12).text('No coupons booked for this participant.', { align: 'center' });
      doc.moveDown();
    }

    // Event Details Card
    const eventCardY = doc.y + 20;
    const eventCardHeight = 100;
    doc.rect(50, eventCardY, pageWidth - 100, eventCardHeight)
       .fillAndStroke('#f9fafb', '#e5e7eb');

    // Add left border accent
    doc.rect(50, eventCardY, 4, eventCardHeight).fill('#6366f1');

    // Event Details Content
    doc.fillColor('#1f2937');
    doc.fontSize(16).text('EVENT DETAILS', 70, eventCardY + 15);
    doc.fillColor('#374151');
    doc.fontSize(12).text(`Venue: ${event.venue || 'TBA'}`, 70, eventCardY + 35);
    const startDate = event.start_date ? new Date(event.start_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'TBA';
    doc.text(`Start Date: ${startDate}`, 70, eventCardY + 55);
    const endDate = event.end_date ? new Date(event.end_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'TBA';
    doc.text(`End Date: ${endDate}`, 70, eventCardY + 75);

    // Footer
    doc.y = doc.page.height - 60;
    doc.fontSize(8).fillColor('#9ca3af').text('Powered by Festify', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Generate participant mobile PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

export const addCouponToParticipant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId, participantId } = req.params;
    const { rate_id, meal_id, quantity = 1 } = req.body;
    const user_id = req.user.user_id;

    const event = await checkEventAccess(eventId, user_id);

    if (!event) {
      res.status(404).json({ error: 'Event not found or access denied' });
      return;
    }

    // Verify participant exists in this event
    const participant = await Participant.findOne({
      where: {
        participant_id: participantId,
        event_id: eventId
      }
    });

    if (!participant) {
      res.status(404).json({ error: 'Participant not found in this event' });
      return;
    }

    // Verify rate and meal exist for this event
    const rate = await CouponRate.findOne({
      where: { rate_id, event_id: eventId }
    });

    const meal = await MealChoice.findOne({
      where: { meal_id, event_id: eventId }
    });

    if (!rate || !meal) {
      res.status(400).json({ error: 'Invalid rate or meal choice for this event' });
      return;
    }

    // Calculate event duration for total_count
    const eventStartDate = new Date(event.start_date);
    const eventEndDate = new Date(event.end_date);
    const eventDurationDays = Math.ceil((eventEndDate.getTime() - eventStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const coupons = [];
    for (let i = 0; i < quantity; i++) {
      const qrCodeValue = generateCouponId();
      const qrCodeLink = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/coupons/view/${qrCodeValue}`;

      const coupon = await Coupon.create({
        participant_id: parseInt(participantId),
        event_id: parseInt(eventId),
        rate_id,
        meal_id,
        qr_code_value: qrCodeValue,
        qr_code_link: qrCodeLink,
        status: 'Booked',
        consumed_count: 0,
        total_count: eventDurationDays,
      });

      coupons.push(coupon);
    }

    // Return updated participant with all coupons
    const updatedParticipant = await Participant.findByPk(participantId, {
      include: [{
        model: Coupon,
        include: [
          { model: CouponRate },
          { model: MealChoice }
        ]
      }]
    });

    res.status(201).json({
      message: `${quantity} coupon(s) added successfully`,
      participant: updatedParticipant,
      couponsGenerated: coupons.length,
      newCoupons: coupons
    });
  } catch (error) {
    console.error('Add coupon to participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};