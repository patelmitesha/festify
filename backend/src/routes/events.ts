import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createEvent,
  getUserEvents,
  getEventDetails,
  updateEvent,
  deleteEvent,
  getPublicEvents
} from '../controllers/eventController';

const router = Router();

// Public routes (no authentication required)
router.get('/public', getPublicEvents);

// Protected routes (authentication required)
router.post('/', authenticateToken, createEvent);
router.get('/', authenticateToken, getUserEvents);
router.get('/:eventId', authenticateToken, getEventDetails);
router.put('/:eventId', authenticateToken, updateEvent);
router.delete('/:eventId', authenticateToken, deleteEvent);

export default router;