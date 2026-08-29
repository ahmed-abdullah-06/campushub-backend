import Marketplace from '../models/Marketplace.js';

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
      .populate('seller', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const getMarketplaceItemById = async (req, res, next) => {
  try {
    const item = await Marketplace.findById(req.params.id).populate('seller', 'name email avatar');
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
    const { title, description, price, category, image } = req.body;

    if (!title || !description || price === undefined) {
      res.status(400);
      throw new Error('Please fill in title, description, and price');
    }

    const item = await Marketplace.create({
      seller: req.user ? req.user._id : null,
      title,
      description,
      price: Number(price),
      category: category || 'General',
      image: image || ''
    });

    res.status(201).json(item);
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

    item.status = status || (item.status === 'available' ? 'sold' : 'available');
    const updatedItem = await item.save();
    res.json(updatedItem);
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

    await item.deleteOne();
    res.json({ message: 'Item listing deleted successfully' });
  } catch (error) {
    next(error);
  }
};