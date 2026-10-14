const crypto = require('node:crypto');
const env = require('../config/env');

const createResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashResetToken(token) };
};

const hashResetToken = (token) =>
  crypto.createHash('sha256').update(String(token || '')).digest('hex');

const isResetTokenFormatValid = (token) => /^[a-f0-9]{64}$/i.test(String(token || ''));

const validateNewPassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must contain at least 8 characters');
  }
  if (password.length > 128) {
    throw new Error('Password cannot exceed 128 characters');
  }
  return password;
};

const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const sendPasswordResetEmail = async ({ to, name, token, idempotencyKey }) => {
  if (!env.passwordResetEmailConfigured) {
    throw new Error('Password reset email delivery is not configured');
  }
  const resetUrl = `${env.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `password-reset/${idempotencyKey}`,
    },
    body: JSON.stringify({
      from: env.passwordResetFromEmail,
      to: [to],
      subject: 'Reset your Vanni Ride password',
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#173d29">
          <h2>Reset your Vanni Ride password</h2>
          <p>Hello ${escapeHtml(name)},</p>
          <p>Use the button below to choose a new password. This link expires in ${env.passwordResetExpiresMinutes} minutes and can be used once.</p>
          <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#247a48;color:#fff;text-decoration:none;font-weight:bold">Reset password</a></p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
      text: `Reset your Vanni Ride password: ${resetUrl}\n\nThis link expires in ${env.passwordResetExpiresMinutes} minutes.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Password reset email delivery failed (${response.status})`);
  }
  return response.json();
};

module.exports = {
  createResetToken,
  hashResetToken,
  isResetTokenFormatValid,
  sendPasswordResetEmail,
  validateNewPassword,
};
