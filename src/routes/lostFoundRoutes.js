import express from 'express';
import {
  getLostFoundPosts,
  getLostFoundById,
  createLostFoundPost,
  updateLostFoundStatus,
  deleteLostFoundPost,
  claimLostFoundPost,
  releaseLostFoundClaim
} from '../controllers/lostFoundController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/lost-found:
 *   get:
 *     summary: Browse lost & found posts (public, supports filters)
 *     tags: [Lost & Found]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [lost, found] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, claimed, resolved] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Array of posts with the poster and claimer populated }
 *   post:
 *     summary: Create a lost or found item post (with an optional uploaded image)
 *     tags: [Lost & Found]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: The created post }
 *       400: { description: Missing required fields }
 */
router.route('/')
  .get(optionalAuth, getLostFoundPosts)
  .post(protect, createLostFoundPost);

/**
 * @swagger
 * /api/lost-found/{id}:
 *   get:
 *     summary: Get one post with full details
 *     tags: [Lost & Found]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: The post }
 *       404: { description: Not found }
 *   delete:
 *     summary: Delete a post (poster or admin only)
 *     tags: [Lost & Found]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Not the owner }
 */
router.route('/:id')
  .get(getLostFoundById)
  .delete(protect, deleteLostFoundPost);

/**
 * @swagger
 * /api/lost-found/{id}/claim:
 *   post:
 *     summary: Claim an item (sends a notification to the poster)
 *     tags: [Lost & Found]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message: { type: string, description: Proof/description for the poster }
 *     responses:
 *       200: { description: The claimed post }
 *       400: { description: Already claimed or resolved }
 *   delete:
 *     summary: Release a claim (claimer, poster or admin)
 *     tags: [Lost & Found]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: The reopened post }
 *       403: { description: Not allowed }
 */
router.post('/:id/claim', protect, claimLostFoundPost);
router.delete('/:id/claim', protect, releaseLostFoundClaim);

/**
 * @swagger
 * /api/lost-found/{id}/status:
 *   patch:
 *     summary: Mark a post resolved / reopen it (poster or admin only)
 *     tags: [Lost & Found]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [open, claimed, resolved] }
 *     responses:
 *       200: { description: The updated post }
 */
router.patch('/:id/status', protect, updateLostFoundStatus);
router.put('/:id/status', protect, updateLostFoundStatus);

export default router;
