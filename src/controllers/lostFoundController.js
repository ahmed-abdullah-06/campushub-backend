import LostFound from '../models/LostFound.js';

export const getLostFoundPosts = async (req, res, next) => {
  try {
    const { type, category, search } = req.query;
    let query = {};

    if (type) query.type = type;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const posts = await LostFound.find(query)
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    next(error);
  }
};

export const getLostFoundById = async (req, res, next) => {
  try {
    const post = await LostFound.findById(req.params.id).populate('user', 'name email avatar');
    if (!post) {
      res.status(404);
      throw new Error('Post not found');
    }
    res.json(post);
  } catch (error) {
    next(error);
  }
};

export const createLostFoundPost = async (req, res, next) => {
  try {
    const { title, description, type, category, location, image, date, dateLost } = req.body;

    if (!title || !description || !type || !location) {
      res.status(400);
      throw new Error('Please fill in all required fields');
    }

    const post = await LostFound.create({
      user: req.user ? req.user._id : null,
      title,
      description,
      type,
      category: category || 'Other',
      location,
      image: image || '',
      dateLost: dateLost || date || new Date().toISOString()
    });

    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
};

export const updateLostFoundStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const post = await LostFound.findById(req.params.id);

    if (!post) {
      res.status(404);
      throw new Error('Post not found');
    }

    post.status = status || (post.status === 'active' ? 'resolved' : 'active');
    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (error) {
    next(error);
  }
};

export const deleteLostFoundPost = async (req, res, next) => {
  try {
    const post = await LostFound.findById(req.params.id);

    if (!post) {
      res.status(404);
      throw new Error('Post not found');
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
};