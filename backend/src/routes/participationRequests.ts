import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkEventAccess, requirePermission } from '../middleware/permissions';
import {
  submitParticipationRequest,
  getEventParticipationRequests,
  approveParticipationRequest,
  rejectParticipationRequest,
  deleteParticipationRequest
} from '../controllers/participationRequestController';

const router = Router();

// Public endpoint for submitting participation requests
router.post('/:eventId/participation-requests', submitParticipationRequest);

// Authenticated endpoints for managing participation requests
router.get('/:eventId/participation-requests', authenticateToken, checkEventAccess, getEventParticipationRequests);
router.post('/:eventId/participation-requests/:requestId/approve', authenticateToken, checkEventAccess, requirePermission('add_participants'), approveParticipationRequest);
router.post('/:eventId/participation-requests/:requestId/reject', authenticateToken, checkEventAccess, requirePermission('add_participants'), rejectParticipationRequest);
router.delete('/:eventId/participation-requests/:requestId', authenticateToken, checkEventAccess, requirePermission('add_participants'), deleteParticipationRequest);

export default router;