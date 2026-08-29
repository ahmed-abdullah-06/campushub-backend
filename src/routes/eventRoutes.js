import express from 'express';
import { getEvents, createEvent, toggleEventRegister } from '../controllers/eventController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getEvents)
  .post(createEvent);

router.put('/:id/register', toggleEventRegister);

export default router;