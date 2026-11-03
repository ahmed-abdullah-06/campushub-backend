import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer')) {
    res.status(401);
    return next(new Error('Not authorized, no token provided'));
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401);
      return next(new Error('Not authorized, user not found'));
    }
    if (user.status === 'suspended') {
      res.status(403);
      return next(new Error('Your account has been suspended. Contact an administrator.'));
    }

    req.user = user;
    return next();
  } catch (error) {
    res.status(401);
    // jwt.verify failures (expired, tampered, malformed) all map to one message
    return next(new Error('Not authorized, token failed'));
  }
};

/**
 * Attaches req.user when a VALID token is present, but never rejects the
 * request. Used by public browse endpoints (GET /events, GET /lost-found)
 * that return extra per-user flags such as `isRegistered` when logged in.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const decoded = jwt.verify(header.split(' ')[1], config.jwtSecret);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.status !== 'suspended') req.user = user;
    }
  } catch {
    // Invalid/expired token on a public route: continue anonymously.
  }
  next();
};