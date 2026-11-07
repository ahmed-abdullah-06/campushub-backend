import express from 'express';
import { registerUser, loginUser, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authRateLimit } from '../middleware/securityMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new CampusHub account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Alex Johnson }
 *               email: { type: string, example: alex.j@university.edu }
 *               password: { type: string, minLength: 6, example: password123 }
 *     responses:
 *       201: { description: "Account created, returns the user and a JWT" }
 *       400: { description: Validation error or email already in use }
 *       429: { description: Too many attempts }
 */
router.post('/register', authRateLimit, registerUser);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in and receive a JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Returns the user profile and token }
 *       401: { description: Invalid credentials }
 *       403: { description: Account suspended }
 *       429: { description: Too many attempts }
 */
router.post('/login', authRateLimit, loginUser);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password-reset link by email
 *     description: Always returns the same generic message (never reveals whether the email is registered). The link expires after 30 minutes.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: alex.j@university.edu }
 *     responses:
 *       200: { description: Generic confirmation message }
 *       400: { description: Invalid email }
 *       429: { description: Too many attempts }
 */
router.post('/forgot-password', authRateLimit, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Set a new password using a valid reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string, description: Token from the emailed reset link }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: "Password updated — returns the user profile and a JWT" }
 *       400: { description: Invalid or expired token }
 *       403: { description: Account suspended }
 *       429: { description: Too many attempts }
 */
router.post('/reset-password', authRateLimit, resetPassword);

export default router;
