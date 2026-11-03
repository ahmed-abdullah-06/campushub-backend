import mongoose from 'mongoose';
import Report from '../models/Report.js';
import LostFound from '../models/LostFound.js';
import Marketplace from '../models/Marketplace.js';
import Event from '../models/Event.js';
import Note from '../models/Note.js';
import Skill from '../models/Skill.js';
import User from '../models/User.js';
import { notifyAdmins } from '../utils/notificationService.js';

// Maps a report's targetType to the collection that holds the reported document.
export const TARGET_MODELS = {
  LostFound,
  Marketplace,
  Event,
  Note,
  Skill,
  User
};

// @desc    Report inappropriate content (post, listing, note, event, profile)
// @route   POST /api/reports
// @access  Private
export const createReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reason } = req.body;

    if (!targetType || !Object.keys(TARGET_MODELS).includes(targetType)) {
      res.status(400);
      throw new Error('Please provide a valid content type to report');
    }
    if (!targetId || !mongoose.isValidObjectId(targetId)) {
      res.status(400);
      throw new Error('Please provide a valid item to report');
    }
    if (!reason || !String(reason).trim()) {
      res.status(400);
      throw new Error('Please tell us why you are reporting this content');
    }

    const target = await TARGET_MODELS[targetType].findById(targetId);
    if (!target) {
      res.status(404);
      throw new Error('The content you tried to report no longer exists');
    }

    // Don't let one account spam hundreds of duplicate reports.
    const existing = await Report.findOne({
      reporter: req.user._id,
      targetType,
      targetId,
      status: 'pending'
    });
    if (existing) {
      res.status(400);
      throw new Error('You already have a pending report for this content');
    }

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason: String(reason).trim().slice(0, 500)
    });

    // Surface the reported document's title so the admin panel is readable.
    const title = target.title || target.name || target.userName || 'Unknown item';
    await notifyAdmins({
      sender: req.user._id,
      type: 'report',
      targetId: report._id,
      message: `${req.user.name} reported ${targetType} "${title}"`
    });

    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

// @desc    The reports this student filed (their own "my reports" view)
// @route   GET /api/reports/mine
// @access  Private
export const getMyReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ reporter: req.user._id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    next(error);
  }
};
