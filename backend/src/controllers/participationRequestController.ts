import { Request, Response } from 'express';
import ParticipationRequest from '../models/ParticipationRequest';
import Event from '../models/Event';
import Participant from '../models/Participant';
import Coupon from '../models/Coupon';
import { generateCouponId } from '../utils/qr';

// Submit a participation request (public endpoint)
export const submitParticipationRequest = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { name, address, contact_number, email, message, coupon_bookings } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if event exists and is active
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Create participation request
    const participationRequest = await ParticipationRequest.create({
      event_id: parseInt(eventId),
      name: name.trim(),
      address: address?.trim(),
      contact_number: contact_number?.trim(),
      email: email?.trim(),
      message: message?.trim(),
      coupon_bookings: coupon_bookings ? JSON.stringify(coupon_bookings) : undefined,
      status: 'pending'
    });

    res.status(201).json({
      message: 'Participation request submitted successfully',
      request: participationRequest
    });
  } catch (error: any) {
    console.error('Error submitting participation request:', error);
    res.status(500).json({ error: 'Failed to submit participation request' });
  }
};

// Get all participation requests for an event (authenticated)
export const getEventParticipationRequests = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;

    const whereClause: any = { event_id: eventId };
    if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
      whereClause.status = status;
    }

    const requests = await ParticipationRequest.findAll({
      where: whereClause,
      include: [
        {
          model: Event,
          attributes: ['name', 'description']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching participation requests:', error);
    res.status(500).json({ error: 'Failed to fetch participation requests' });
  }
};

// Approve a participation request and create participant
export const approveParticipationRequest = async (req: Request, res: Response) => {
  try {
    const { eventId, requestId } = req.params;
    const { coupon_bookings } = req.body;

    // Find the participation request
    const participationRequest = await ParticipationRequest.findOne({
      where: {
        request_id: requestId,
        event_id: eventId,
        status: 'pending'
      }
    });

    if (!participationRequest) {
      return res.status(404).json({ error: 'Participation request not found or already processed' });
    }

    // Create participant
    const participant = await Participant.create({
      event_id: parseInt(eventId),
      name: participationRequest.name,
      address: participationRequest.address,
      contact_number: participationRequest.contact_number,
      email: participationRequest.email
    });

    // Update request status
    await participationRequest.update({ status: 'approved' });

    // If coupon bookings are provided, create coupons
    if (coupon_bookings && coupon_bookings.length > 0) {
      for (const booking of coupon_bookings) {
        for (let i = 0; i < booking.quantity; i++) {
          const qrCodeValue = generateCouponId();
          const qrCodeLink = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/coupons/view/${qrCodeValue}`;

          await Coupon.create({
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
        }
      }
    }

    res.json({
      message: 'Participation request approved and participant created',
      participant,
      request: participationRequest
    });
  } catch (error: any) {
    console.error('Error approving participation request:', error);
    res.status(500).json({ error: 'Failed to approve participation request' });
  }
};

// Reject a participation request
export const rejectParticipationRequest = async (req: Request, res: Response) => {
  try {
    const { eventId, requestId } = req.params;
    const { reason } = req.body;

    // Find and update the participation request
    const participationRequest = await ParticipationRequest.findOne({
      where: {
        request_id: requestId,
        event_id: eventId,
        status: 'pending'
      }
    });

    if (!participationRequest) {
      return res.status(404).json({ error: 'Participation request not found or already processed' });
    }

    await participationRequest.update({
      status: 'rejected',
      message: reason ? `Rejected: ${reason}` : 'Rejected'
    });

    res.json({
      message: 'Participation request rejected',
      request: participationRequest
    });
  } catch (error: any) {
    console.error('Error rejecting participation request:', error);
    res.status(500).json({ error: 'Failed to reject participation request' });
  }
};

// Delete a participation request
export const deleteParticipationRequest = async (req: Request, res: Response) => {
  try {
    const { eventId, requestId } = req.params;

    const participationRequest = await ParticipationRequest.findOne({
      where: {
        request_id: requestId,
        event_id: eventId
      }
    });

    if (!participationRequest) {
      return res.status(404).json({ error: 'Participation request not found' });
    }

    await participationRequest.destroy();

    res.json({ message: 'Participation request deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting participation request:', error);
    res.status(500).json({ error: 'Failed to delete participation request' });
  }
};