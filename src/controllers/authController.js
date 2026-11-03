import User from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/hashPassword.js';
import { generateToken } from '../utils/generateToken.js';
import { validateEmail, validatePassword } from '../utils/validators.js';
import {
  createPasswordResetToken,
  sendPasswordResetEmail,
  findUserByResetToken,
  clearResetToken
} from '../utils/emailService.js';

// Single source of truth for what the frontend receives after auth.
// Includes profile fields + settings so the Profile/Settings screens render
// immediately after login without a second round-trip, and NEVER the password.
const formatUser = (user, token) => ({
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
  },
  ...(token ? { token } : {})
});

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, university, major, year } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please enter all required fields');
    }

    if (!validateEmail(email)) {
      res.status(400);
      throw new Error('Please enter a valid email address');
    }

    if (!validatePassword(password)) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this email');
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name: String(name).trim(),
      email,
      password: hashedPassword,
      university: university || undefined,
      major: major || '',
      year: year || ''
    });

    if (user) {
      res.status(201).json(formatUser(user, generateToken(user._id, user.role)));
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide email and password');
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });

    if (user && (await comparePassword(password, user.password))) {
      if (user.status === 'suspended') {
        res.status(403);
        throw new Error('Your account has been suspended. Contact an administrator.');
      }
      res.json(formatUser(user, generateToken(user._id, user.role)));
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Start the password-reset flow (emails a single-use link)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !validateEmail(email)) {
      res.status(400);
      throw new Error('Please provide a valid email address');
    }

    // Always answer with the same generic message so this endpoint cannot be
    // used to probe which emails are registered on the platform.
    const genericResponse = {
      message: 'If an account exists for that email, a password reset link has been sent.'
    };

    const reset = await createPasswordResetToken(email);
    if (reset) {
      // Fire-and-forget: a slow SMTP server must not delay the HTTP response.
      sendPasswordResetEmail(email, reset.token).catch(() => {});
    }
    res.json(genericResponse);
  } catch (error) {
    next(error);
  }
};

// @desc    Complete the password reset with a valid token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400);
      throw new Error('Reset token is missing');
    }
    if (!validatePassword(password)) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    const user = await findUserByResetToken(token);
    if (!user) {
      res.status(400);
      throw new Error('This reset link is invalid or has expired. Please request a new one.');
    }

    if (user.status === 'suspended') {
      res.status(403);
      throw new Error('Your account has been suspended. Contact an administrator.');
    }

    user.password = await hashPassword(password);
    await user.save(); // persist the new password
    await clearResetToken(user);

    // Log the user straight in — one less step after resetting.
    res.json({ message: 'Password updated', ...formatUser(user, generateToken(user._id, user.role)) });
  } catch (error) {
    next(error);
  }
};
