import Marketplace from '../models/Marketplace.js';
import { createNotification, clearNotificationsFor } from '../utils/notificationService.js';

const canManage = (req, doc) => {
  if (!req.user) return false;
  return req.user.role === 'admin' || String(doc.seller) === String(req.user._id);
};

export const getMarketplaceItems = async (req, res, next) => {
  try {
    const { category, status, search } = req.query;
    let query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const items = await Marketplace.find(query)
      .populate('seller', 'name email avatar university')
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const getMarketplaceItemById = async (req, res, next) => {
  try {
    const item = await Marketplace.findById(req.params.id)
      .populate('seller', 'name email avatar university');
    if (!item) {
      res.status(404);
      throw new Error('Marketplace item not found');
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const createMarketplaceItem = async (req, res, next) => {
  try {
    const { title, description, price, category, condition, image } = req.body;

    if (!title || !description || price === undefined || price === null || price === '') {
      res.status(400);
      throw new Error('Please fill in title, description, and price');
    }
    if (Number(price) < 0) {
      res.status(400);
      throw new Error('Price cannot be negative');
    }

    const item = await Marketplace.create({
      seller: req.user._id,
      title,
      description,
      price: Number(price),
      category: category || 'Other',
      condition: condition || 'Good',
      image: image || ''
    });

    res.status(201).json(await item.populate('seller', 'name email avatar university'));
  } catch (error) {
    next(error);
  }
};

export const updateMarketplaceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const item = await Marketplace.findById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error('Item not found');
    }
    if (!canManage(req, item)) {
      res.status(403);
      throw new Error('Only the seller or an admin can update this listing');
    }
    if (status && !['available', 'sold'].includes(status)) {
      res.status(400);
      throw new Error("Status must be 'available' or 'sold'");
    }

    item.status = status || (item.status === 'available' ? 'sold' : 'available');
    const updatedItem = await item.save();
    res.json(await updatedItem.populate('seller', 'name email avatar university'));
  } catch (error) {
    next(error);
  }
};

export const deleteMarketplaceItem = async (req, res, next) => {
  try {
    const item = await Marketplace.findById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error('Item not found');
    }
    if (!canManage(req, item)) {
      res.status(403);
      throw new Error('Only the seller or an admin can delete this listing');
    }

    await item.deleteOne();
    await clearNotificationsFor(item._id);
    res.json({ message: 'Item listing deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Contact the seller of a listing
// @route   POST /api/marketplace/:id/contact
// @access  Private
// Sends the seller an in-app notification containing the buyer's message and
// returns the seller's contact details so the buyer can continue the chat.
export const contactSeller = async (req, res, next) => {
  try {
    const item = await Marketplace.findById(req.params.id)
      .populate('seller', 'name email avatar university');
    if (!item) {
      res.status(404);
      throw new Error('Item not found');
    }
    if (!item.seller) {
      res.status(400);
      throw new Error('This listing has no contact on file');
    }
    if (String(item.seller._id) === String(req.user._id)) {
      res.status(400);
      throw new Error('This is your own listing');
    }
    if (item.status === 'sold') {
      res.status(400);
      throw new Error('This item has already been sold');
    }

    const message = String(req.body.message || '').trim().slice(0, 500);
    if (!message) {
      res.status(400);
      throw new Error('Please write a message for the seller');
    }

    await createNotification({
      recipient: item.seller._id,
      sender: req.user._id,
      type: 'marketplace',
      targetId: item._id,
      message: `${req.user.name} is interested in "${item.title}": ${message}`
    });

    res.json({
      message: 'Message delivered to the seller',
      seller: {
        name: item.seller.name,
        email: item.seller.email,
        university: item.seller.university
      }
    });
  } catch (error) {
    next(error);
  }
};
