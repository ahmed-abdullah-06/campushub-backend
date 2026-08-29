import Report from '../models/Report.js';
import User from '../models/User.js';

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