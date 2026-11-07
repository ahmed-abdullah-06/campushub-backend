import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Students only ever see their own notifications — every route requires auth.
router.use(protect);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: List my notifications (newest first, max 100)
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Array of notifications }
 *       401: { description: Not authenticated }
 */
router.get('/', getNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Unread badge count for the bell icon
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ count: number }" }
 */
router.get('/unread-count', getUnreadCount);

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark every notification of mine as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Confirmation }
 */
router.put('/read-all', markAllNotificationsRead);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark one notification as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: The notification }
 *       404: { description: Not mine or not found }
 */
router.put('/:id/read', markNotificationRead);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Dismiss one of my notifications
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Removed }
 */
router.delete('/:id', deleteNotification);

export default router;
