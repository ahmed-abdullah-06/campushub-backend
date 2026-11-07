import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  updateUserSettings
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get the logged-in user's profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The current user (no password) }
 *       401: { description: Not authenticated }
 *   put:
 *     summary: Update profile fields (name, email, role, bio, ...)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The updated user }
 *       403: { description: Attempted to self-assign the admin role }
 */
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

/**
 * @swagger
 * /api/users/settings:
 *   put:
 *     summary: Persist notification/privacy/language preferences
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailNotifs: { type: boolean }
 *               pushNotifs: { type: boolean }
 *               profileVisible: { type: boolean }
 *               language: { type: string, enum: [en, ur] }
 *     responses:
 *       200: { description: Saved settings }
 */
router.put('/settings', protect, updateUserSettings);

export default router;
