import Skill from '../models/Skill.js';
import SkillRequest from '../models/SkillRequest.js';

export const getSkills = async (req, res, next) => {
  try {
    const skills = await Skill.find().sort({ createdAt: -1 });
    res.json(skills);
  } catch (error) { next(error); }
};

export const createSkillProfile = async (req, res, next) => {
  try {
    const { userName, major, university, offeredSkills, wantedSkills, bio } = req.body;
    const newSkill = await Skill.create({
      user: req.user ? req.user._id : null,
      userName: userName || (req.user ? req.user.name : 'Student'),
      major: major || 'Computer Science',
      university: university || 'Campus',
      offeredSkills: Array.isArray(offeredSkills) ? offeredSkills : [offeredSkills],
      wantedSkills: Array.isArray(wantedSkills) ? wantedSkills : [wantedSkills],
      bio: bio || ''
    });
    res.status(201).json(newSkill);
  } catch (error) { next(error); }
};

export const sendSkillRequest = async (req, res, next) => {
  try {
    const { toUser, skillOffered, skillWanted, message } = req.body;
    const newRequest = await SkillRequest.create({
      fromUser: req.user ? { id: req.user._id, name: req.user.name, avatar: req.user.avatar } : { id: 'u1', name: 'Alex Johnson' },
      toUser,
      skillOffered,
      skillWanted,
      message,
      status: 'pending'
    });
    res.status(201).json(newRequest);
  } catch (error) { next(error); }
};

export const getSkillRequests = async (req, res, next) => {
  try {
    const requests = await SkillRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) { next(error); }
};

export const respondSkillRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    const request = await SkillRequest.findById(req.params.id);
    if (!request) {
      res.status(404);
      throw new Error('Skill request not found');
    }
    request.status = status;
    await request.save();
    res.json(request);
  } catch (error) { next(error); }
};