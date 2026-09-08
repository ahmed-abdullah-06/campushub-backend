import express from 'express';
import { 
  getSkills, 
  createSkillProfile, 
  sendSkillRequest, 
  getSkillRequests, 
  respondSkillRequest 
} from '../controllers/skillController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getSkills)
  .post(protect, createSkillProfile);

router.route('/requests')
  .get(protect, getSkillRequests)
  .post(protect, sendSkillRequest);

router.put('/requests/:id', protect, respondSkillRequest);

export default router;