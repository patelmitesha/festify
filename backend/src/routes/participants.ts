import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkEventAccess, requirePermission } from '../middleware/permissions';
import {
  addParticipant,
  getEventParticipants,
  updateParticipant,
  deleteParticipant,
  searchParticipantsByPhone,
  generateParticipantMobilePDF,
  addCouponToParticipant
} from '../controllers/participantController';

const router = Router();

router.post('/:eventId/participants', authenticateToken, checkEventAccess, requirePermission('add_participants'), addParticipant);
router.get('/:eventId/participants', authenticateToken, checkEventAccess, getEventParticipants);
router.get('/:eventId/participants/search', authenticateToken, checkEventAccess, searchParticipantsByPhone);
router.get('/:eventId/participants/:participantId/mobile-pdf', authenticateToken, checkEventAccess, generateParticipantMobilePDF);
router.post('/:eventId/participants/:participantId/coupons', authenticateToken, checkEventAccess, requirePermission('add_participants'), addCouponToParticipant);
router.put('/:eventId/participants/:participantId', authenticateToken, checkEventAccess, requirePermission('add_participants'), updateParticipant);
router.delete('/:eventId/participants/:participantId', authenticateToken, checkEventAccess, requirePermission('add_participants'), deleteParticipant);

export default router;