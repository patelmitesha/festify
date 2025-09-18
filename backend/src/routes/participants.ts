import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  addParticipant,
  getEventParticipants,
  updateParticipant,
  deleteParticipant
} from '../controllers/participantController';

const router = Router();

router.post('/:eventId/participants', authenticateToken, addParticipant);
router.get('/:eventId/participants', authenticateToken, getEventParticipants);
router.put('/:eventId/participants/:participantId', authenticateToken, updateParticipant);
router.delete('/:eventId/participants/:participantId', authenticateToken, deleteParticipant);

export default router;