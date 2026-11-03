import LostFound from '../models/LostFound.js';
import { createNotification, clearNotificationsFor } from '../utils/notificationService.js';

// Ownership rule: the poster of a post may manage it, and so may an admin.
// Previously any logged-in student could delete or edit anyone's post.
const canManage = (req, doc) => {
  if (!req.user) return false;
  return req.user.role === 'admin' || String(doc.user) === String(req.user._id);
};

export const getLostFoundPosts = async (req, res, next) => {
  try {
    const { type, category, status, search } = req.query;
    let query = {};

    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const posts = await LostFound.find(query)
      .populate('user', 'name email avatar university')
      .populate('claimedBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    next(error);
  }
};

export const getLostFoundById = async (req, res, next) => {
  try {
    const post = await LostFound.findById(req.params.id)
      .populate('user', 'name email avatar university')
      .populate('claimedBy', 'name email avatar');
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
    if (!['lost', 'found'].includes(type)) {
      res.status(400);
      throw new Error("Type must be either 'lost' or 'found'");
    }

    const post = await LostFound.create({
      user: req.user._id,
      title,
      description,
      type,
      category: category || 'Other',
      location,
      image: image || '',
      dateLost: dateLost || date || new Date().toISOString().slice(0, 10)
    });

    const populated = await post.populate('user', 'name email avatar university');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Claim an item (a finder claims a LOST item, or a student claims a FOUND one)
// @route   POST /api/lost-found/:id/claim
// @access  Private
export const claimLostFoundPost = async (req, res, next) => {
  try {
    const post = await LostFound.findById(req.params.id).populate('user', 'name email avatar');
    if (!post) {
      res.status(404);
      throw new Error('Post not found');
    }
    if (post.status === 'resolved') {
      res.status(400);
      throw new Error('This item has already been resolved');
    }
    if (post.status === 'claimed' && String(post.claimedBy) !== String(req.user._id)) {
      res.status(400);
      throw new Error('Someone else has already claimed this item');
    }
    if (String(post.user?._id || post.user) === String(req.user._id)) {
      res.status(400);
      throw new Error('You cannot claim your own post');
    }

    post.claimedBy = req.user._id;
    post.claimNote = String(req.body.message || '').slice(0, 500);
    post.claimedAt = new Date();
    post.status = 'claimed';
    await post.save();

    await createNotification({
      recipient: post.user._id,
      sender: req.user._id,
      type: 'claim',
      targetId: post._id,
      message: `${req.user.name} claimed your post "${post.title}"`
    });

    res.json(await post.populate([
      { path: 'user', select: 'name email avatar university' },
      { path: 'claimedBy', select: 'name email avatar' }
    ]));
  } catch (error) {
    next(error);
  }
};

// @desc    Release a claim (by the claimer, the poster, or an admin)
// @route   DELETE /api/lost-found/:id/claim
// @access  Private
export const releaseLostFoundClaim = async (req, res, next) => {
  try {
    const post = await LostFound.findById(req.params.id).populate('user', 'name email avatar');
    if (!post) {
      res.status(404);
      throw new Error('Post not found');
    }

    const isClaimer = post.claimedBy && String(post.claimedBy) === String(req.user._id);
    if (!isClaimer && !canManage(req, post)) {
      res.status(403);
      throw new Error('Only the claimer or the poster can release this claim');
    }

    const previousClaimer = post.claimedBy;
    post.claimedBy = null;
    post.claimNote = '';
    post.claimedAt = null;
    post.status = 'open';
    await post.save();

    if (previousClaimer && String(previousClaimer) !== String(req.user._id)) {
      await createNotification({
        recipient: previousClaimer,
        sender: req.user._id,
        type: 'claim',
        targetId: post._id,
        message: `The claim on "${post.title}" was released`
      });
    }

    res.json(await post.populate([
      { path: 'user', select: 'name email avatar university' },
      { path: 'claimedBy', select: 'name email avatar' }
    ]));
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
    if (!canManage(req, post)) {
      res.status(403);
      throw new Error('Only the poster or an admin can update this post');
    }
    if (status && !['open', 'claimed', 'resolved'].includes(status)) {
      res.status(400);
      throw new Error("Status must be 'open', 'claimed' or 'resolved'");
    }

    post.status = status || (post.status === 'resolved' ? 'open' : 'resolved');
    const updatedPost = await post.save();
    res.json(
      await updatedPost.populate([
        { path: 'user', select: 'name email avatar university' },
        { path: 'claimedBy', select: 'name email avatar' }
      ])
    );
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
    if (!canManage(req, post)) {
      res.status(403);
      throw new Error('Only the poster or an admin can delete this post');
    }

    await post.deleteOne();
    await clearNotificationsFor(post._id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
};
