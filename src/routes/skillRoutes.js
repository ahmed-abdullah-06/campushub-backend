import express from 'express';
import {
  getSkills,
  createSkillProfile,
  sendSkillRequest,
  getSkillRequests,
  respondSkillRequest
} from '../controllers/skillController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/skills:
 *   get:
 *     summary: Browse every student's skill profile (public)
 *     tags: [Skill Exchange]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Array of skill profiles }
 *   post:
 *     summary: Create or update MY skill profile (upsert)
 *     tags: [Skill Exchange]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: The saved profile }
 *       400: { description: No skills provided }
 */
router.route('/')
  .get(optionalAuth, getSkills)
  .post(protect, createSkillProfile);

/**
 * @swagger
 * /api/skills/requests:
 *   get:
 *     summary: Exchange requests I sent or received
 *     tags: [Skill Exchange]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Array of requests with both students populated }
 *   post:
 *     summary: Send an exchange request to another student
 *     tags: [Skill Exchange]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toUser, skillOffered, skillWanted]
 *             properties:
 *               toUser: { type: string, description: Student's User id }
 *               skillOffered: { type: string, example: Python }
 *               skillWanted: { type: string, example: Figma }
 *               message: { type: string }
 *     responses:
 *       201: { description: The created request }
 *       400: { description: Invalid target or duplicate pending request }
 */
router.route('/requests')
  .get(protect, getSkillRequests)
  .post(protect, sendSkillRequest);

/**
 * @swagger
 * /api/skills/requests/{id}:
 *   put:
 *     summary: Accept or reject an incoming request (recipient only)
 *     tags: [Skill Exchange]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [accepted, rejected] }
 *     responses:
 *       200: { description: The updated request }
 *       403: { description: Not the receiver of this request }
 */
router.put('/requests/:id', protect, respondSkillRequest);

export default router;
