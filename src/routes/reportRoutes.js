import express from 'express';
import { createReport, getMyReports } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Report inappropriate content (admins are notified)
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetType, targetId, reason]
 *             properties:
 *               targetType: { type: string, enum: [LostFound, Marketplace, User, Skill, Event, Note] }
 *               targetId: { type: string }
 *               reason: { type: string, maxLength: 500 }
 *     responses:
 *       201: { description: The created report }
 *       400: { description: Invalid target or duplicate pending report }
 */
router.post('/', protect, createReport);

/**
 * @swagger
 * /api/reports/mine:
 *   get:
 *     summary: Reports filed by the logged-in student
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Array of my reports }
 */
router.get('/mine', protect, getMyReports);

export default router;
