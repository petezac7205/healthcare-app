import { Router } from 'express';
import { searchDoctors, getDoctorDetail, getAvailableSlots } from '../controllers/doctorController.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(searchDoctors));
router.get('/:id', asyncHandler(getDoctorDetail));
// Requires auth to get slots as patient needs to be logged in
router.get('/:id/slots', auth, asyncHandler(getAvailableSlots));

export default router;
