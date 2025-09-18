import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getCouponByQR,
  generateCouponPDF,
  getEventCoupons
} from '../controllers/couponController';
import {
  redeemCoupon,
  getCouponRedemptions
} from '../controllers/redemptionController';

const router = Router();

router.get('/qr/:qrCode', authenticateToken, getCouponByQR);
router.post('/redeem/:qrCode', authenticateToken, redeemCoupon);
router.get('/events/:eventId', authenticateToken, getEventCoupons);
router.get('/events/:eventId/pdf/:participantId', authenticateToken, generateCouponPDF);
router.get('/events/:eventId/redemptions', authenticateToken, getCouponRedemptions);

export default router;