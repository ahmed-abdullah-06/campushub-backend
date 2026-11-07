import express from 'express';
import {
  getReports,
  resolveReport,
  removeReportedContent,
  getAllUsers,
  toggleUserSuspend,
  getAdminStats
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Every route below requires BOTH being logged in AND having the admin role.
router.use(protect, authorize('admin'));

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Platform-wide counters for the admin dashboard
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "Counts for users, posts, listings, events, notes, reports" }
 *       403: { description: Admin role required }
 */
router.get('/stats', getAdminStats);

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     summary: All content reports with readable target titles
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, reviewed, dismissed] }
 *     responses:
 *       200: { description: Array of decorated reports }
 *       403: { description: Admin role required }
 */
router.get('/reports', getReports);

/**
 * @swagger
 * /api/admin/reports/{id}:
 *   put:
 *     summary: Mark a report reviewed/dismissed (notifies the reporter)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: The updated report }
 *       403: { description: Admin role required }
 */
router.put('/reports/:id', resolveReport);

/**
 * @swagger
 * /api/admin/reports/{id}/content:
 *   delete:
 *     summary: Remove the reported content (suspends reported users) and resolve the report
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Action taken + the report }
 *       403: { description: Admin role required }
 */
router.delete('/reports/:id/content', removeReportedContent);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List every account (without passwords)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Array of users }
 *       403: { description: Admin role required }
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /api/admin/users/{id}/suspend:
 *   put:
 *     summary: Suspend or reinstate an account (not your own)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Updated user summary }
 *       403: { description: Admin role required }
 */
router.put('/users/:id/suspend', toggleUserSuspend);

export default router;
