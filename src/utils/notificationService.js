import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendActivityEmail } from './emailService.js';

// Human-readable subjects for the email twin of each notification type.
const EMAIL_SUBJECTS = {
  claim: 'Lost & Found update',
  'skill-request': 'New Skill Exchange request',
  event: 'Event update',
  report: 'Content report',
  marketplace: 'Marketplace update',
  system: 'CampusHub'
};

/**
 * Creates a notification for a single user.
 * Never throws into the caller's request flow: a failed notification should
 * not roll back the action that triggered it (e.g. claiming an item).
 *
 * When the recipient has email notifications enabled in Settings, the same
 * message is also emailed (fire-and-forget — SMTP never delays the response).
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.recipient - user to notify
 * @param {string|import('mongoose').Types.ObjectId} [params.sender] - who caused it
 * @param {string} params.type - 'claim' | 'skill-request' | 'event' | 'report' | 'marketplace' | 'system'
 * @param {string} params.message - human readable text shown in the UI
 * @returns {Promise<object|null>}
 */
export const createNotification = async ({ recipient, sender = null, type, message }) => {
  try {
    if (!recipient || !message) return null;
    const notification = await Notification.create({ recipient, sender, type, message });

    // Email twin of the in-app notification (respects the Settings toggle).
    sendActivityEmail(recipient, {
      subject: `CampusHub — ${EMAIL_SUBJECTS[type] || 'Notification'}`,
      text: message
    }).catch(() => {});

    return notification;
  } catch (error) {
    console.warn('Notification not created:', error.message);
    return null;
  }
};

/**
 * Fans a message out to every admin account (used for content reports).
 * @returns {Promise<number>} number of admins notified
 */
export const notifyAdmins = async ({ sender = null, type = 'report', message }) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    if (admins.length === 0) return 0;
    await Notification.insertMany(
      admins.map((admin) => ({ recipient: admin._id, sender, type, message }))
    );
    return admins.length;
  } catch (error) {
    console.warn('Admin notifications not created:', error.message);
    return 0;
  }
};

/**
 * Deletes notifications that point at a document that was just removed
 * (deleted post, resolved report, ...). Keeps the bell list free of dead links.
 */
export const clearNotificationsFor = async (targetId) => {
  try {
    await Notification.deleteMany({ targetId });
  } catch {
    /* non-critical */
  }
};
