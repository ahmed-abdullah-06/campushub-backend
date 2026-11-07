import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { config } from '../config/env.js';
import User from '../models/User.js';

// ---------------------------------------------------------------------------
// Email service.
// Uses SMTP when SMTP_HOST/SMTP_USER/SMTP_PASS are configured (production).
// With no SMTP config (local dev) emails are printed to the server console so
// every flow stays testable without an email account.
// ---------------------------------------------------------------------------

const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else if (config.isProduction) {
  console.warn('⚠️  SMTP is not configured — outbound emails will be logged instead of sent.');
}

const FROM = process.env.EMAIL_FROM || 'CampusHub <no-reply@campushub.local>';

/**
 * Sends an email. Never throws — an email failure must not break the request
 * that triggered it (claiming an item, resetting a password, ...).
 * @returns {Promise<boolean>} true when the email was handed to SMTP
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) return false;
  try {
    if (transporter) {
      await transporter.sendMail({ from: FROM, to, subject, text, html });
      return true;
    }
    // Dev fallback: make the email visible in the server console.
    console.log(`\n📧 [dev-email] To: ${to}\n   Subject: ${subject}\n   ${String(text).replace(/\n/g, '\n   ')}\n`);
    return false;
  } catch (error) {
    console.warn('Email not sent:', error.message);
    return false;
  }
};

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Simple branded wrapper so every email looks like CampusHub.
const wrap = (title, bodyHtml) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px">
      <div style="width:32px;height:32px;border-radius:8px;background:#4F46E5;color:#fff;text-align:center;line-height:32px;font-weight:700">C</div>
      <strong style="font-size:16px">CampusHub</strong>
    </div>
    <h2 style="font-size:18px;margin:0 0 12px">${title}</h2>
    <div style="font-size:14px;line-height:1.6;color:#374151">${bodyHtml}</div>
    <p style="font-size:12px;color:#9CA3AF;margin-top:28px">Sent by CampusHub — your university's campus platform.</p>
  </div>`;

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

const RESET_TTL_MINUTES = 30;

/**
 * Creates a single-use, expiring reset token for a user.
 * Only the SHA-256 hash is stored, so a database leak cannot expose live tokens.
 * @returns {{ token: string, expiresAt: Date } | null}
 */
export const createPasswordResetToken = async (email) => {
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) return null; // caller replies with a generic success message

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  user.resetToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetTokenExpires = expiresAt;
  await user.save();

  return { token, expiresAt };
};

/** Emails the reset link. Fails silently (never reveals whether the email exists). */
export const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${config.clientUrl.replace(/\/$/, '')}/#/reset-password?token=${token}`;
  return sendEmail({
    to: email,
    subject: 'Reset your CampusHub password',
    text: `Someone (hopefully you) asked to reset the CampusHub password for this email.\n\nChoose a new password within ${RESET_TTL_MINUTES} minutes using this link:\n${resetUrl}\n\nIf you didn't request this, you can ignore this email — your password stays unchanged.`,
    html: wrap('Reset your password', `
      <p>Someone (hopefully you) asked to reset the CampusHub password for this email.</p>
      <p style="margin:20px 0">
        <a href="${resetUrl}" style="background:#4F46E5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Choose a new password</a>
      </p>
      <p>This link expires in ${RESET_TTL_MINUTES} minutes. If you didn't request this, ignore this email — your password stays unchanged.</p>`)
  });
};

/**
 * Validates a reset token against the database (hash comparison + expiry).
 * @returns {Promise<import('mongoose').Document|null>} the matching user
 */
export const findUserByResetToken = async (token) => {
  if (!token || typeof token !== 'string') return null;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  return User.findOne({
    resetToken: hashed,
    resetTokenExpires: { $gt: new Date() }
  });
};

/** Clears the reset token after a successful password change (single use). */
export const clearResetToken = async (user) => {
  // Explicit $unset: resetToken is select:false, so it may not be loaded on
  // the document and a plain save() could silently skip clearing it.
  await User.updateOne(
    { _id: user._id },
    { $unset: { resetToken: '', resetTokenExpires: '' } }
  );
};

// ---------------------------------------------------------------------------
// Activity emails (respect the per-account "email notifications" setting)
// ---------------------------------------------------------------------------

/**
 * Emails a user about an in-app notification, but only when their Settings
 * screen has email notifications enabled. Fire-and-forget from callers.
 */
export const sendActivityEmail = async (userId, { subject, text }) => {
  try {
    const user = await User.findById(userId).select('email name settings');
    if (!user || !user.settings?.emailNotifs) return false;
    return sendEmail({
      to: user.email,
      subject,
      text: `Hi ${user.name},\n\n${text}\n\n— CampusHub`,
      html: wrap(escapeHtml(subject), `<p>Hi ${escapeHtml(user.name)},</p><p>${escapeHtml(text)}</p>`)
    });
  } catch {
    return false;
  }
};
