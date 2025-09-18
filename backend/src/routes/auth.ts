import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

router.post('/register', (req, res, next) => {
  console.log('🛣️  Auth Routes - POST /register called');
  register(req, res);
});

router.post('/login', (req, res, next) => {
  console.log('🛣️  Auth Routes - POST /login called');
  login(req, res);
});

export default router;