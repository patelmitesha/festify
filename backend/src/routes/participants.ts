import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  addParticipant,
  getEventParticipants,
  updateParticipant,
  deleteParticipant,
  searchParticipantsByPhone,
  generateParticipantMobilePDF
} from '../controllers/participantController';

const router = Router();

router.post('/:eventId/participants', authenticateToken, addParticipant);
router.get('/:eventId/participants', authenticateToken, getEventParticipants);
router.get('/:eventId/participants/search', authenticateToken, searchParticipantsByPhone);
router.get('/:eventId/participants/:participantId/mobile-pdf', authenticateToken, generateParticipantMobilePDF);
router.put('/:eventId/participants/:participantId', authenticateToken, updateParticipant);
router.delete('/:eventId/participants/:participantId', authenticateToken, deleteParticipant);

export default router;