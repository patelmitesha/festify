import { Response } from 'express';
import { Event, CouponRate, MealChoice, Participant, Coupon } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

export const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, venue, start_date, end_date, coupon_rates, meal_choices } = req.body;
    const user_id = req.user.user_id;

    if (!name || !start_date || !end_date) {
      res.status(400).json({ error: 'Name, start date, and end date are required' });
      return;
    }

    const event = await Event.create({
      user_id,
      name,
      description,
      venue,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
    });

    if (coupon_rates && coupon_rates.length > 0) {
      for (const rate of coupon_rates) {
        await CouponRate.create({
          event_id: event.event_id,
          rate_type: rate.rate_type,
          price: rate.price,
        });
      }
    }

    if (meal_choices && meal_choices.length > 0) {
      for (const meal of meal_choices) {
        await MealChoice.create({
          event_id: event.event_id,
          meal_type: meal.meal_type,
        });
      }
    }

    const eventWithDetails = await Event.findByPk(event.event_id, {
      include: [
        { model: CouponRate },
        { model: MealChoice }
      ]
    });

    res.status(201).json({
      message: 'Event created successfully',
      event: eventWithDetails,
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user.user_id;

    const events = await Event.findAll({
      where: { user_id },
      include: [
        { model: CouponRate },
        { model: MealChoice }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(events);
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEventDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const user_id = req.user.user_id;

    const event = await Event.findOne({
      where: {
        event_id: eventId,
        user_id
      },
      include: [
        { model: CouponRate },
        { model: MealChoice },
        { model: Participant }
      ]
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { name, description, venue, start_date, end_date } = req.body;
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

    await event.update({
      name: name || event.name,
      description: description || event.description,
      venue: venue || event.venue,
      start_date: start_date ? new Date(start_date) : event.start_date,
      end_date: end_date ? new Date(end_date) : event.end_date,
    });

    const updatedEvent = await Event.findByPk(event.event_id, {
      include: [
        { model: CouponRate },
        { model: MealChoice }
      ]
    });

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    await event.destroy();

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};