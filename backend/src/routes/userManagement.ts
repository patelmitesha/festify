import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createRepresentative,
  getMyRepresentatives,
  updateRepresentativePermissions,
  deleteRepresentative,
  getRepresentativeEvents
} from '../controllers/userManagementController';

const router = Router();

// Manager routes - create and manage representatives
router.post('/representatives', authenticateToken, createRepresentative);
router.get('/representatives', authenticateToken, getMyRepresentatives);
router.put('/representatives/:representativeId/permissions', authenticateToken, updateRepresentativePermissions);
router.delete('/representatives/:representativeId', authenticateToken, deleteRepresentative);

// Representative routes - get assigned events
router.get('/representative/events', authenticateToken, getRepresentativeEvents);

export default router;