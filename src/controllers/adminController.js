import Report from '../models/Report.js';
import User from '../models/User.js';
import LostFound from '../models/LostFound.js';
import Marketplace from '../models/Marketplace.js';
import Event from '../models/Event.js';
import Note from '../models/Note.js';
import Skill from '../models/Skill.js';
import SkillRequest from '../models/SkillRequest.js';
import Notification from '../models/Notification.js';
import { TARGET_MODELS } from './reportController.js';
import { clearNotificationsFor, createNotification } from '../utils/notificationService.js';

// Attaches the reported document (title + status) to each report so the admin
// panel can show WHAT was reported instead of just an opaque id.
const decorateReports = async (reports) => {
  const populated = await Promise.all(
    reports.map(async (report) => {
      const plain = report.toObject();
      const model = TARGET_MODELS[report.targetType];
      let targetTitle = 'Content removed';
      let targetStatus = null;
      let reporter = null;

      try {
        if (model) {
          const target = await model.findById(report.targetId).select('title name userName status email');
          if (target) {
            targetTitle = target.title || target.name || target.userName || 'Unknown item';
            targetStatus = target.status || null;
          } else {
            targetStatus = 'deleted';
          }
        }
        const who = await User.findById(report.reporter).select('name email');
        if (who) reporter = { name: who.name, email: who.email };
      } catch {
        /* fall back to defaults */
      }

      return { ...plain, targetTitle, targetStatus, reporter };
    })
  );
  return populated;
};

export const getReports = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const reports = await Report.find(query).sort({ createdAt: -1 });
    res.json(await decorateReports(reports));
  } catch (error) {
    next(error);
  }
};

export const resolveReport = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['pending', 'reviewed', 'dismissed'].includes(status)) {
      res.status(400);
      throw new Error("Status must be 'pending', 'reviewed' or 'dismissed'");
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      res.status(404);
      throw new Error('Report not found');
    }
    report.status = status;
    await report.save();

    await createNotification({
      recipient: report.reporter,
      sender: req.user._id,
      type: 'report',
      targetId: report._id,
      message:
        status === 'dismissed'
          ? 'Your report was reviewed and dismissed'
          : 'Your report was reviewed — thank you for helping keep CampusHub safe'
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove the reported content, then resolve the report
// @route   DELETE /api/admin/reports/:id/content
// @access  Private/Admin
// This is the "Review/delete inappropriate post" capability from the project plan.
// For a reported USER the account is suspended instead of deleted, so the
// platform keeps an audit trail of who it was.
export const removeReportedContent = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      res.status(404);
      throw new Error('Report not found');
    }

    const model = TARGET_MODELS[report.targetType];
    if (!model) {
      res.status(400);
      throw new Error('This report type cannot be resolved by removal');
    }

    let action = 'content_deleted';
    const target = await model.findById(report.targetId);

    if (!target) {
      action = 'already_deleted';
    } else if (report.targetType === 'User') {
      target.status = 'suspended';
      await target.save();
      action = 'user_suspended';
      await Notification.deleteMany({ recipient: target._id });
    } else {
      await model.deleteOne({ _id: target._id });
      await clearNotificationsFor(target._id);
    }

    report.status = 'reviewed';
    await report.save();

    if (report.targetType === 'User' && target) {
      await createNotification({
        recipient: target._id,
        type: 'system',
        message: 'Your account has been suspended after a content review. Contact an administrator.'
      });
    }

    res.json({ message: 'Reported content handled', action, report });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const toggleUserSuspend = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    if (String(user._id) === String(req.user._id)) {
      res.status(400);
      throw new Error('You cannot suspend your own account');
    }

    user.status = user.status === 'suspended' ? 'active' : 'suspended';
    await user.save();

    if (user.status === 'suspended') {
      await Notification.deleteMany({ recipient: user._id });
      await createNotification({
        recipient: user._id,
        type: 'system',
        message: 'Your account has been suspended by an administrator.'
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: user.role
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform-wide statistics for the Admin dashboard
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getAdminStats = async (req, res, next) => {
  try {
    // Run all counts in parallel rather than one after another — much faster
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalLostFound,
      openLostFound,
      totalMarketplace,
      soldMarketplace,
      totalEvents,
      totalNotes,
      totalSkills,
      pendingRequests,
      pendingReports
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: { $ne: 'suspended' } }),
      User.countDocuments({ status: 'suspended' }),
      LostFound.countDocuments(),
      LostFound.countDocuments({ status: 'open' }),
      Marketplace.countDocuments(),
      Marketplace.countDocuments({ status: 'sold' }),
      Event.countDocuments(),
      Note.countDocuments(),
      Skill.countDocuments(),
      SkillRequest.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'pending' })
    ]);

    res.json({
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
      lostFound: { total: totalLostFound, open: openLostFound },
      marketplace: { total: totalMarketplace, sold: soldMarketplace },
      events: { total: totalEvents },
      notes: { total: totalNotes },
      skills: { total: totalSkills, pendingRequests },
      reports: { pending: pendingReports }
    });
  } catch (error) {
    next(error);
  }
};
