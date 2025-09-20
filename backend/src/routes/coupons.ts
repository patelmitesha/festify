import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkEventAccess, requirePermission } from '../middleware/permissions';
import {
  getCouponByQR,
  getCouponDataByQR,
  viewCouponByQR,
  generateCouponPDF,
  generateSingleCouponPDF,
  getEventCoupons,
  deleteCoupon
} from '../controllers/couponController';
import {
  redeemCoupon,
  getCouponRedemptions
} from '../controllers/redemptionController';

const router = Router();

router.get('/qr/:qrCode', authenticateToken, getCouponByQR);
router.get('/data/:qrCode', getCouponDataByQR);
router.get('/view/:qrCode', viewCouponByQR);
router.post('/redeem/:qrCode', authenticateToken, requirePermission('redeem_coupons'), redeemCoupon);
router.get('/events/:eventId', authenticateToken, checkEventAccess, getEventCoupons);
router.get('/events/:eventId/pdf/:participantId', authenticateToken, checkEventAccess, generateCouponPDF);
router.get('/pdf/:couponId', authenticateToken, generateSingleCouponPDF);
router.delete('/:couponId', authenticateToken, requirePermission('add_participants'), deleteCoupon);
router.get('/events/:eventId/redemptions', authenticateToken, checkEventAccess, getCouponRedemptions);

export default router;