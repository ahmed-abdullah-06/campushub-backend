import express from 'express';
import {
  getMarketplaceItems,
  getMarketplaceItemById,
  createMarketplaceItem,
  updateMarketplaceStatus,
  deleteMarketplaceItem
} from '../controllers/marketplaceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getMarketplaceItems)
  .post(protect, createMarketplaceItem);

router.route('/:id')
  .get(getMarketplaceItemById)
  .delete(protect, deleteMarketplaceItem);

router.patch('/:id/status', protect, updateMarketplaceStatus);
router.put('/:id/status', protect, updateMarketplaceStatus);

export default router;