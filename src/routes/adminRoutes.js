import express from 'express';
import { getReports, resolveReport, getAllUsers, toggleUserSuspend } from '../controllers/adminController.js';

const router = express.Router();

router.get('/reports', getReports);
router.put('/reports/:id', resolveReport);
router.get('/users', getAllUsers);
router.put('/users/:id/suspend', toggleUserSuspend);

export default router;