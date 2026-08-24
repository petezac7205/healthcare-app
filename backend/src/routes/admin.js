import { Router } from 'express';
import {
  createDoctor,
  listDoctors,
  getDoctor,
  updateDoctor,
  deleteDoctor,
  setDoctorHours,
  getDoctorHours,
  markDoctorLeave,
  getDoctorLeaves,
  getNotifications
} from '../controllers/adminController.js';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(auth, authorize('admin'));

router.post('/doctors', asyncHandler(createDoctor));
router.get('/doctors', asyncHandler(listDoctors));
router.get('/doctors/:id', asyncHandler(getDoctor));
router.put('/doctors/:id', asyncHandler(updateDoctor));
router.delete('/doctors/:id', asyncHandler(deleteDoctor));

router.post('/doctors/:id/hours', asyncHandler(setDoctorHours));
router.get('/doctors/:id/hours', asyncHandler(getDoctorHours));

router.post('/doctors/:id/leave', asyncHandler(markDoctorLeave));
router.get('/doctors/:id/leave', asyncHandler(getDoctorLeaves));

router.get('/notifications', asyncHandler(getNotifications));

export default router;
