import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  holdSlot,
  confirmAppointment,
  cancelAppointment,
  getMyAppointments,
  getDoctorAppointments,
  getAppointmentDetail,
  submitSymptoms,
  submitVisitNotes
} from '../controllers/appointmentController.js';

const router = Router();

// All appointment routes require authentication
router.use(auth);

// Patient routes
router.post('/hold', authorize('patient'), asyncHandler(holdSlot));
router.post('/:id/confirm', authorize('patient'), asyncHandler(confirmAppointment));
router.get('/my', authorize('patient'), asyncHandler(getMyAppointments));
router.post('/:id/symptoms', authorize('patient'), asyncHandler(submitSymptoms));

// Doctor routes
router.get('/doctor', authorize('doctor'), asyncHandler(getDoctorAppointments));
router.post('/:id/notes', authorize('doctor'), asyncHandler(submitVisitNotes));

// Shared routes (patient, doctor, or admin can access)
router.post('/:id/cancel', asyncHandler(cancelAppointment));
router.get('/:id', asyncHandler(getAppointmentDetail));

export default router;
