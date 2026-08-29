import express from 'express';
import { 
  getSkills, 
  createSkillProfile, 
  sendSkillRequest, 
  getSkillRequests, 
  respondSkillRequest 
} from '../controllers/skillController.js';

const router = express.Router();

router.route('/')
  .get(getSkills)
  .post(createSkillProfile);

router.route('/requests')
  .get(getSkillRequests)
  .post(sendSkillRequest);

router.put('/requests/:id', respondSkillRequest);

export default router;