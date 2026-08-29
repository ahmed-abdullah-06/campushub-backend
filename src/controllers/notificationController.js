import Notification from '../models/Notification.js';

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) { next(error); }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      res.status(404);
      throw new Error('Notification not found');
    }
    notification.isRead = true;
    await notification.save();
    res.json(notification);
  } catch (error) { next(error); }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({}, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) { next(error); }
};

export const deleteNotification = async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification removed' });
  } catch (error) { next(error); }
};