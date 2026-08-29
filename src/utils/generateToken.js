import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const generateToken = (id, role) => {
  return jwt.sign({ id, role }, config.jwtSecret, {
    expiresIn: '30d'
  });
};