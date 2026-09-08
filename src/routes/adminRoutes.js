import express from 'express';
import { getReports, resolveReport, getAllUsers, toggleUserSuspend, getAdminStats } from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Every route below requires BOTH being logged in AND having the admin role.
// This is the fix for the biggest security gap found in the project review.
router.get('/stats', protect, authorize('admin'), getAdminStats);
router.get('/reports', protect, authorize('admin'), getReports);
router.put('/reports/:id', protect, authorize('admin'), resolveReport);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.put('/users/:id/suspend', protect, authorize('admin'), toggleUserSuspend);

export default router;