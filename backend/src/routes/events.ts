import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createEvent,
  getUserEvents,
  getEventDetails,
  updateEvent,
  deleteEvent
} from '../controllers/eventController.js';

const router = Router();

router.post('/', authenticateToken, createEvent);
router.get('/', authenticateToken, getUserEvents);
router.get('/:eventId', authenticateToken, getEventDetails);
router.put('/:eventId', authenticateToken, updateEvent);
router.delete('/:eventId', authenticateToken, deleteEvent);

export default router;