import express from 'express';
import {
  getLostFoundPosts,
  getLostFoundById,
  createLostFoundPost,
  updateLostFoundStatus,
  deleteLostFoundPost
} from '../controllers/lostFoundController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Browsing is public — anyone can see what's posted, logged in or not
router.route('/')
  .get(getLostFoundPosts)
  .post(protect, createLostFoundPost);   // must be logged in to post

router.route('/:id')
  .get(getLostFoundById)
  .delete(protect, deleteLostFoundPost);  // must be logged in to delete

router.patch('/:id/status', protect, updateLostFoundStatus);
router.put('/:id/status', protect, updateLostFoundStatus);

export default router;