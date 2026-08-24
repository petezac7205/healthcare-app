import { Router } from 'express';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import doctorRoutes from './doctors.js';
import appointmentRoutes from './appointments.js';
import oauthRoutes from './oauth.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/oauth', oauthRoutes);

export default router;
