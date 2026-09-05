import express from 'express';
import { upload } from '../middleware/uploadMiddleware.js';
import { uploadImage } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 'image' must match the field name the frontend sends in its FormData
router.post('/', protect, upload.single('image'), uploadImage);

export default router;