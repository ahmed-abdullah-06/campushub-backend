import express from 'express';
import {
  getMarketplaceItems,
  getMarketplaceItemById,
  createMarketplaceItem,
  updateMarketplaceStatus,
  deleteMarketplaceItem,
  contactSeller
} from '../controllers/marketplaceController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/marketplace:
 *   get:
 *     summary: Browse listings (public, supports category/status/search filters)
 *     tags: [Marketplace]
 *     responses:
 *       200: { description: Array of listings with seller details populated }
 *   post:
 *     summary: Create a listing
 *     tags: [Marketplace]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: The created listing }
 *       400: { description: "Missing title, description or price" }
 */
router.route('/')
  .get(optionalAuth, getMarketplaceItems)
  .post(protect, createMarketplaceItem);

/**
 * @swagger
 * /api/marketplace/{id}:
 *   get:
 *     summary: Get one listing
 *     tags: [Marketplace]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: The listing }
 *   delete:
 *     summary: Delete a listing (seller or admin only)
 *     tags: [Marketplace]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Not the seller }
 */
router.route('/:id')
  .get(getMarketplaceItemById)
  .delete(protect, deleteMarketplaceItem);

/**
 * @swagger
 * /api/marketplace/{id}/contact:
 *   post:
 *     summary: Message the seller (notification + returns their contact details)
 *     tags: [Marketplace]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *     responses:
 *       200: { description: Seller contact info }
 *       400: { description: "Empty message, own listing or already sold" }
 */
router.post('/:id/contact', protect, contactSeller);

/**
 * @swagger
 * /api/marketplace/{id}/status:
 *   patch:
 *     summary: Mark a listing available/sold (seller or admin only)
 *     tags: [Marketplace]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: The updated listing }
 */
router.patch('/:id/status', protect, updateMarketplaceStatus);
router.put('/:id/status', protect, updateMarketplaceStatus);

export default router;
