import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', auth, asyncHandler(getMe));

export default router;
