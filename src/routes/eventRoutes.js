import express from 'express';
import { getEvents, createEvent, toggleEventRegister } from '../controllers/eventController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getEvents)
  .post(protect, createEvent);

router.put('/:id/register', protect, toggleEventRegister);

export default router;