import User from '../models/User.js';
import { hashPassword } from '../utils/hashPassword.js';
import { validateEmail } from '../utils/validators.js';

// Roles a user is allowed to set on themselves. "admin" is deliberately excluded —
// that can only be granted by an existing admin, via the Admin Panel's user management.
const SELF_ASSIGNABLE_ROLES = ['student', 'faculty', 'staff', 'alumni'];

const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || '',
  university: user.university || '',
  major: user.major || '',
  year: user.year || '',
  bio: user.bio || '',
  status: user.status,
  settings: {
    emailNotifs: user.settings?.emailNotifs ?? true,
    pushNotifs: user.settings?.pushNotifs ?? true,
    profileVisible: user.settings?.profileVisible ?? true,
    language: user.settings?.language ?? 'en'
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(formatUser(user));
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (req.body.name !== undefined) {
      if (!String(req.body.name).trim()) {
        res.status(400);
        throw new Error('Name cannot be empty');
      }
      user.name = String(req.body.name).trim();
    }
    user.avatar = req.body.avatar || user.avatar;
    user.university = req.body.university !== undefined ? req.body.university : user.university;
    user.major = req.body.major !== undefined ? req.body.major : user.major;
    user.year = req.body.year !== undefined ? req.body.year : user.year;
    user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;

    // Email change — validate format, and check it's not already taken by someone else
    if (req.body.email && req.body.email !== user.email) {
      if (!validateEmail(req.body.email)) {
        res.status(400);
        throw new Error('Please enter a valid email address');
      }
      const emailTaken = await User.findOne({ email: req.body.email, _id: { $ne: user._id } });
      if (emailTaken) {
        res.status(400);
        throw new Error('That email is already in use by another account');
      }
      user.email = req.body.email;
    }

    // Role change — only allow self-assignment to non-admin roles
    if (req.body.role && req.body.role !== user.role) {
      if (user.role === 'admin') {
        res.status(403);
        throw new Error('Admin accounts cannot change their own role. Ask another admin.');
      }
      if (!SELF_ASSIGNABLE_ROLES.includes(req.body.role)) {
        res.status(403);
        throw new Error('You cannot assign yourself that role. Contact an admin.');
      }
      user.role = req.body.role;
    }

    if (req.body.password) {
      if (req.body.password.length < 6) {
        res.status(400);
        throw new Error('Password must be at least 6 characters');
      }
      user.password = await hashPassword(req.body.password);
    }

    const updatedUser = await user.save();
    res.json(formatUser(updatedUser));
  } catch (error) {
    next(error);
  }
};

// @desc    Persist Settings-screen preferences (notifications, privacy, language)
// @route   PUT /api/users/settings
// @access  Private
export const updateUserSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { emailNotifs, pushNotifs, profileVisible, language } = req.body;

    if (emailNotifs !== undefined) user.settings.emailNotifs = Boolean(emailNotifs);
    if (pushNotifs !== undefined) user.settings.pushNotifs = Boolean(pushNotifs);
    if (profileVisible !== undefined) user.settings.profileVisible = Boolean(profileVisible);
    if (language !== undefined) {
      if (!['en', 'ur'].includes(language)) {
        res.status(400);
        throw new Error('Unsupported language');
      }
      user.settings.language = language;
    }

    const updated = await user.save();
    res.json({ message: 'Settings saved', settings: formatUser(updated).settings });
  } catch (error) {
    next(error);
  }
};
