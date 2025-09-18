import { Response } from 'express';
import { Coupon, Event, Participant, CouponRate, MealChoice, Redemption } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';

export const redeemCoupon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { qrCode } = req.params;
    const { redeemCount } = req.body;
    const user_id = req.user.user_id;

    if (!redeemCount || redeemCount < 1) {
      res.status(400).json({ error: 'Redeem count must be at least 1' });
      return;
    }

    const coupon = await Coupon.findOne({
      where: { qr_code_value: qrCode },
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
      res.status(404).json({ error: 'Coupon not found or not authorized' });
      return;
    }

    if (coupon.status === 'Consumed') {
      res.status(400).json({ error: 'Coupon is already fully consumed' });
      return;
    }

    const remainingCount = coupon.total_count - coupon.consumed_count;
    if (redeemCount > remainingCount) {
      res.status(400).json({
        error: `Cannot redeem ${redeemCount} coupons. Only ${remainingCount} remaining.`
      });
      return;
    }

    const newConsumedCount = coupon.consumed_count + redeemCount;
    let newStatus: 'Booked' | 'Consumed' | 'Partial' = 'Partial';

    if (newConsumedCount >= coupon.total_count) {
      newStatus = 'Consumed';
    } else if (newConsumedCount > 0) {
      newStatus = 'Partial';
    } else {
      newStatus = 'Booked';
    }

    await coupon.update({
      consumed_count: newConsumedCount,
      status: newStatus
    });

    await Redemption.create({
      coupon_id: coupon.coupon_id,
      redeemed_count: redeemCount,
      redeemed_by: user_id
    });

    const updatedCoupon = await Coupon.findByPk(coupon.coupon_id, {
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

    res.json({
      message: `Successfully redeemed ${redeemCount} coupon(s)`,
      coupon: updatedCoupon,
      redeemedCount: redeemCount,
      remainingCount: coupon.total_count - newConsumedCount
    });
  } catch (error) {
    console.error('Redeem coupon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCouponRedemptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const redemptions = await Redemption.findAll({
      include: [
        {
          model: Coupon,
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
          ]
        }
      ],
      order: [['redeemed_at', 'DESC']]
    });

    res.json({ redemptions });
  } catch (error) {
    console.error('Get redemptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};