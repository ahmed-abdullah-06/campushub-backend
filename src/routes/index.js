import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import lostFoundRoutes from './lostFoundRoutes.js';
import marketplaceRoutes from './marketplaceRoutes.js';
import adminRoutes from './adminRoutes.js';
import skillRoutes from './skillRoutes.js';
import eventRoutes from './eventRoutes.js';
import noteRoutes from './noteRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/lost-found', lostFoundRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/admin', adminRoutes);
router.use('/skills', skillRoutes);
router.use('/events', eventRoutes);
router.use('/notes', noteRoutes);
router.use('/notifications', notificationRoutes);

export default router;