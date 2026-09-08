import Report from '../models/Report.js';
import User from '../models/User.js';
import LostFound from '../models/LostFound.js';
import Marketplace from '../models/Marketplace.js';
import Event from '../models/Event.js';
import Note from '../models/Note.js';

export const getReports = async (req, res, next) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) { next(error); }
};

export const resolveReport = async (req, res, next) => {
  try {
    const { status } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) {
      res.status(404);
      throw new Error('Report not found');
    }
    report.status = status;
    await report.save();
    res.json(report);
  } catch (error) { next(error); }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) { next(error); }
};

export const toggleUserSuspend = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    user.status = user.status === 'suspended' ? 'active' : 'suspended';
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, status: user.status });
  } catch (error) { next(error); }
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
      Report.countDocuments({ status: 'pending' })
    ]);

    res.json({
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
      lostFound: { total: totalLostFound, open: openLostFound },
      marketplace: { total: totalMarketplace, sold: soldMarketplace },
      events: { total: totalEvents },
      notes: { total: totalNotes },
      reports: { pending: pendingReports }
    });
  } catch (error) {
    next(error);
  }
};