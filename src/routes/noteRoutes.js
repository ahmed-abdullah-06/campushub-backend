import express from 'express';
import {
  getNotes,
  createNote,
  incrementDownloads,
  rateNote,
  deleteNote
} from '../controllers/noteController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/notes:
 *   get:
 *     summary: Browse course notes (public, supports department/courseCode/search)
 *     tags: [Notes]
 *     responses:
 *       200: { description: Array of notes with uploader populated }
 *   post:
 *     summary: Publish a note (optionally attaching an uploaded file's URL)
 *     tags: [Notes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: The created note }
 *       400: { description: Missing title or course code }
 */
router.route('/')
  .get(optionalAuth, getNotes)
  .post(protect, createNote);

/**
 * @swagger
 * /api/notes/{id}/download:
 *   put:
 *     summary: Increment the real download counter
 *     tags: [Notes]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Updated note }
 *       404: { description: Not found }
 */
router.put('/:id/download', protect, incrementDownloads);

/**
 * @swagger
 * /api/notes/{id}/rate:
 *   put:
 *     summary: Rate a note 1-5 (one vote per student)
 *     tags: [Notes]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *     responses:
 *       200: { description: Updated note with recalculated average }
 *       400: { description: Rating outside 1-5 }
 */
router.put('/:id/rate', protect, rateNote);

/**
 * @swagger
 * /api/notes/{id}:
 *   delete:
 *     summary: Delete a note (uploader or admin only)
 *     tags: [Notes]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Not the uploader }
 */
router.delete('/:id', protect, deleteNote);

export default router;
