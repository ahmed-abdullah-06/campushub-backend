import express from 'express';
import {
  getEvents,
  createEvent,
  toggleEventRegister,
  deleteEvent
} from '../controllers/eventController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Browse upcoming events (public; includes isRegistered when logged in)
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Array of events sorted by date }
 *   post:
 *     summary: Create an event (organizer is auto-registered)
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: The created event }
 *       400: { description: "Missing title, description, date or location" }
 */
router.route('/')
  .get(optionalAuth, getEvents)
  .post(protect, createEvent);

/**
 * @swagger
 * /api/events/{id}/register:
 *   put:
 *     summary: Toggle registration (fails when the event is at capacity)
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Updated event with isRegistered + attendeeCount }
 *       400: { description: Event is full }
 */
router.put('/:id/register', protect, toggleEventRegister);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete an event (organizer or admin only)
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Not the organizer }
 */
router.delete('/:id', protect, deleteEvent);

export default router;
