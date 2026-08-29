import express from 'express';
import { getNotes, createNote, incrementDownloads } from '../controllers/noteController.js';

const router = express.Router();

router.route('/')
  .get(getNotes)
  .post(createNote);

router.put('/:id/download', incrementDownloads);

export default router;
