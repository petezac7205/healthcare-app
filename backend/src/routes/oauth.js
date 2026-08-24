import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAuthUrl, handleCallback, checkStatus } from '../controllers/oauthController.js';

const router = Router();

// OAuth callback must be accessible without full auth (user returns from Google)
router.get('/google/callback', asyncHandler(handleCallback));

// These require auth
router.get('/google', auth, asyncHandler(getAuthUrl));
router.get('/google/status', auth, asyncHandler(checkStatus));

export default router;
