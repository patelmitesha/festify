import { Response } from 'express';
import { Event, CouponRate, MealChoice, Participant, Coupon, EventRepresentative, User } from '../models/index';
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

    // Get user to check their role
    const user = await User.findByPk(user_id);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    let events: any[] = [];

    // If user is a manager, get events they own
    if ((user as any).role === 'manager') {
      events = await Event.findAll({
        where: { user_id },
        include: [
          { model: CouponRate },
          { model: MealChoice },
          {
            model: Participant,
            include: [{
              model: Coupon,
              include: [{ model: CouponRate }]
            }]
          }
        ],
        order: [['created_at', 'DESC']]
      });
    }

    // If user is a representative, get events they're assigned to
    if ((user as any).role === 'representative') {
      const assignments = await EventRepresentative.findAll({
        where: { user_id },
        include: [{
          model: Event,
          include: [
            { model: CouponRate },
            { model: MealChoice },
            {
              model: Participant,
              include: [{
                model: Coupon,
                include: [{ model: CouponRate }]
              }]
            }
          ]
        }]
      });

      events = assignments.map(assignment => (assignment as any).Event).filter(Boolean);
    }

    // Calculate statistics for each event
    const eventsWithStats = events.map(event => {
      const eventData = event.toJSON() as any;
      let totalCoupons = 0;
      let redeemedCoupons = 0;
      let totalAmount = 0;
      let redeemedAmount = 0;

      if (eventData.Participants) {
        eventData.Participants.forEach((participant: any) => {
          if (participant.Coupons) {
            participant.Coupons.forEach((coupon: any) => {
              totalCoupons++;
              const couponPrice = parseFloat(coupon.CouponRate?.price || 0);
              totalAmount += couponPrice;

              if (coupon.status === 'Consumed' || coupon.status === 'Partial') {
                redeemedCoupons++;
                if (coupon.status === 'Consumed') {
                  redeemedAmount += couponPrice;
                } else {
                  // For partial, calculate proportional amount
                  const consumedRatio = coupon.consumed_count / coupon.total_count;
                  redeemedAmount += couponPrice * consumedRatio;
                }
              }
            });
          }
        });
      }

      return {
        ...eventData,
        stats: {
          totalCoupons,
          redeemedCoupons,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          redeemedAmount: parseFloat(redeemedAmount.toFixed(2)),
          totalParticipants: eventData.Participants ? eventData.Participants.length : 0
        }
      };
    });

    res.json(eventsWithStats);
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEventDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const user_id = req.user.user_id;

    // Get user to check their role
    const user = await User.findByPk(user_id);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    let event = null;

    // If user is a manager, check if they own the event
    if ((user as any).role === 'manager') {
      event = await Event.findOne({
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
    }

    // If user is a representative, check if they're assigned to this event
    if ((user as any).role === 'representative') {
      const assignment = await EventRepresentative.findOne({
        where: { event_id: eventId, user_id },
        include: [{
          model: Event,
          include: [
            { model: CouponRate },
            { model: MealChoice },
            { model: Participant }
          ]
        }]
      });

      if (assignment) {
        event = (assignment as any).Event;
      }
    }

    if (!event) {
      res.status(404).json({ error: 'Event not found or access denied' });
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

export const getPublicEvents = async (req: any, res: Response): Promise<void> => {
  try {
    const now = new Date();

    const events = await Event.findAll({
      where: {
        end_date: {
          [require('sequelize').Op.gte]: now
        }
      },
      include: [
        { model: CouponRate },
        { model: MealChoice }
      ],
      order: [['start_date', 'ASC']],
      limit: 50
    });

    const publicEvents = events.map(event => {
      const eventData = event.toJSON() as any;
      return {
        event_id: eventData.event_id,
        name: eventData.name,
        description: eventData.description,
        venue: eventData.venue,
        start_date: eventData.start_date,
        end_date: eventData.end_date,
        CouponRates: eventData.CouponRates,
        MealChoices: eventData.MealChoices
      };
    });

    res.json(publicEvents);
  } catch (error) {
    console.error('Get public events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};