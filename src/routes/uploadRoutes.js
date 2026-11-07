import express from 'express';
import { upload, uploadNote, attachFilename } from '../middleware/uploadMiddleware.js';
import { uploadImage, uploadNoteFile, deleteUploadedFile } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // uploads require a logged-in student

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload an image (JPG/PNG/WEBP/GIF, max 5MB)
 *     tags: [Uploads]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary }
 *     responses:
 *       201: { description: "{ imageUrl: string }" }
 *       400: { description: Wrong file type or too large }
 *   delete:
 *     summary: Delete an uploaded file by path (inside /uploads only)
 *     tags: [Uploads]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: path
 *         schema: { type: string, example: /uploads/notes/notes.pdf }
 *     responses:
 *       200: { description: Removed }
 */
// 'image' must match the field name the frontend sends in its FormData
router.post('/', upload.single('image'), attachFilename, uploadImage);

/**
 * @swagger
 * /api/upload/note:
 *   post:
 *     summary: Upload a course-notes file (PDF/DOC/PPT/TXT/ZIP, max 10MB)
 *     tags: [Uploads]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: "{ fileUrl, fileName, fileSize }" }
 *       400: { description: Unsupported document type or too large }
 */
router.post('/note', uploadNote.single('file'), attachFilename, uploadNoteFile);

router.delete('/', deleteUploadedFile);

export default router;
