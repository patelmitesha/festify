import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getEventSummary, exportEventReport } from '../controllers/reportController';

const router = Router();

router.get('/:eventId/summary', authenticateToken, getEventSummary);
router.get('/:eventId/export', authenticateToken, exportEventReport);

export default router;