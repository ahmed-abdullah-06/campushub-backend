import express from 'express';
import {
  getLostFoundPosts,
  getLostFoundById,
  createLostFoundPost,
  updateLostFoundStatus,
  deleteLostFoundPost
} from '../controllers/lostFoundController.js';

const router = express.Router();

router.route('/')
  .get(getLostFoundPosts)
  .post(createLostFoundPost);

router.route('/:id')
  .get(getLostFoundById)
  .delete(deleteLostFoundPost);

router.patch('/:id/status', updateLostFoundStatus);
router.put('/:id/status', updateLostFoundStatus);

export default router;