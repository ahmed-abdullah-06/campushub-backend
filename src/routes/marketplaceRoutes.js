import express from 'express';
import {
  getMarketplaceItems,
  getMarketplaceItemById,
  createMarketplaceItem,
  updateMarketplaceStatus,
  deleteMarketplaceItem
} from '../controllers/marketplaceController.js';

const router = express.Router();

router.route('/')
  .get(getMarketplaceItems)
  .post(createMarketplaceItem);

router.route('/:id')
  .get(getMarketplaceItemById)
  .delete(deleteMarketplaceItem);

router.patch('/:id/status', updateMarketplaceStatus);
router.put('/:id/status', updateMarketplaceStatus);

export default router;