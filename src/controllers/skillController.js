import mongoose from 'mongoose';
import Skill from '../models/Skill.js';
import SkillRequest from '../models/SkillRequest.js';
import User from '../models/User.js';
import { createNotification } from '../utils/notificationService.js';

const USER_FIELDS = 'name email avatar university major';
const REQUEST_FIELDS = 'name email avatar';

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (!value) return [];
  // Accepts a single string or a comma-separated list from a text input
  // e.g. "Python, Git" -> ['Python', 'Git']
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

export const getSkills = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { offeredSkills: { $regex: search, $options: 'i' } },
        { wantedSkills: { $regex: search, $options: 'i' } }
      ];
    }

    const skills = await Skill.find(query)
      .populate('user', USER_FIELDS)
      .sort({ createdAt: -1 });

    res.json(skills);
  } catch (error) {
    next(error);
  }
};

// @desc    Create (or update) the logged-in student's own skill profile
// @route   POST /api/skills
// @access  Private
// Upsert keyed on `user` so re-submitting the form updates the same profile
// instead of piling up duplicate cards in the exchange board.
export const createSkillProfile = async (req, res, next) => {
  try {
    const { userName, major, university, offeredSkills, wantedSkills, bio } = req.body;

    const offered = toArray(offeredSkills);
    const wanted = toArray(wantedSkills);

    if (offered.length === 0 && wanted.length === 0) {
      res.status(400);
      throw new Error('Add at least one skill you can teach or want to learn');
    }

    const payload = {
      user: req.user._id,
      userName: userName || req.user.name,
      major: major || req.user.major || 'Computer Science',
      university: university || req.user.university || 'Campus',
      offeredSkills: offered,
      wantedSkills: wanted,
      bio: bio || ''
    };

    const skill = await Skill.findOneAndUpdate(
      { user: req.user._id },
      { $set: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.status(201).json(skill);
  } catch (error) {
    next(error);
  }
};

// @desc    Send a skill-exchange request to another student
// @route   POST /api/skills/requests
// @access  Private
export const sendSkillRequest = async (req, res, next) => {
  try {
    const { toUser, skillOffered, skillWanted, message } = req.body;

    if (!toUser || !mongoose.isValidObjectId(toUser)) {
      res.status(400);
      throw new Error('Please select a valid student to send the request to');
    }
    if (String(toUser) === String(req.user._id)) {
      res.status(400);
      throw new Error('You cannot send a skill request to yourself');
    }
    if (!skillOffered || !skillWanted) {
      res.status(400);
      throw new Error('Please specify both the skill you offer and the skill you want');
    }

    const target = await User.findById(toUser).select('-password');
    if (!target) {
      res.status(404);
      throw new Error('That student no longer exists');
    }
    if (target.status === 'suspended') {
      res.status(400);
      throw new Error('That account is suspended and cannot receive requests');
    }

    const duplicate = await SkillRequest.findOne({
      fromUser: req.user._id,
      toUser: target._id,
      skillOffered,
      skillWanted,
      status: 'pending'
    });
    if (duplicate) {
      res.status(400);
      throw new Error('You already have a pending request with this student for those skills');
    }

    const newRequest = await SkillRequest.create({
      fromUser: req.user._id,
      toUser: target._id,
      skillOffered,
      skillWanted,
      message: String(message || '').slice(0, 500),
      status: 'pending'
    });

    await createNotification({
      recipient: target._id,
      sender: req.user._id,
      type: 'skill-request',
      targetId: newRequest._id,
      message: `${req.user.name} wants to exchange skills with you (${skillOffered} ⇄ ${skillWanted})`
    });

    res.status(201).json(
      await newRequest.populate([
        { path: 'fromUser', select: REQUEST_FIELDS },
        { path: 'toUser', select: REQUEST_FIELDS }
      ])
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Requests where I am the sender or the receiver
// @route   GET /api/skills/requests
// @access  Private
export const getSkillRequests = async (req, res, next) => {
  try {
    const requests = await SkillRequest.find({
      $or: [{ fromUser: req.user._id }, { toUser: req.user._id }]
    })
      .populate('fromUser', REQUEST_FIELDS)
      .populate('toUser', REQUEST_FIELDS)
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    next(error);
  }
};

// @desc    Accept or reject an incoming request
// @route   PUT /api/skills/requests/:id
// @access  Private (recipient only)
export const respondSkillRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      res.status(400);
      throw new Error("Status must be 'accepted' or 'rejected'");
    }

    const request = await SkillRequest.findById(req.params.id);
    if (!request) {
      res.status(404);
      throw new Error('Skill request not found');
    }
    if (String(request.toUser) !== String(req.user._id)) {
      res.status(403);
      throw new Error('Only the student who received this request can respond to it');
    }
    if (request.status !== 'pending') {
      res.status(400);
      throw new Error('This request has already been responded to');
    }

    request.status = status;
    await request.save();

    await createNotification({
      recipient: request.fromUser,
      sender: req.user._id,
      type: 'skill-request',
      targetId: request._id,
      message:
        status === 'accepted'
          ? `${req.user.name} accepted your skill exchange request (${request.skillOffered} ⇄ ${request.skillWanted})`
          : `${req.user.name} declined your skill exchange request`
    });

    res.json(
      await request.populate([
        { path: 'fromUser', select: REQUEST_FIELDS },
        { path: 'toUser', select: REQUEST_FIELDS }
      ])
    );
  } catch (error) {
    next(error);
  }
};
