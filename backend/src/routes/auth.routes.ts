// ─── Auth Routes ────────────────────────────────────────────────────────────
import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Public routes (rate-limited)
router.post('/admin-register', authLimiter, authController.adminRegister);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Google OAuth routes (public)
router.get('/google', authController.googleRedirect);
router.get('/google/callback', authController.googleCallback);

// Protected routes
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, authController.changePassword);

export default router;
