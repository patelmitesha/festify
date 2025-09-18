import { Response } from 'express';
import { Event, Participant, Coupon, CouponRate, MealChoice } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateCouponId } from '../utils/qr';

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

    if (!name || !coupon_bookings || coupon_bookings.length === 0) {
      res.status(400).json({ error: 'Name and coupon bookings are required' });
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
        const qrCodeLink = `${process.env.FRONTEND_URL}/coupon/${qrCodeValue}`;

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

    res.json({ participants });
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