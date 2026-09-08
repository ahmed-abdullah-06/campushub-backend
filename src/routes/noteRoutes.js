import express from 'express';
import { getNotes, createNote, incrementDownloads } from '../controllers/noteController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getNotes)
  .post(protect, createNote);

router.put('/:id/download', protect, incrementDownloads);

export default router;