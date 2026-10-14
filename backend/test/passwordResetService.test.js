const assert = require('node:assert/strict');
const test = require('node:test');

const env = require('../src/config/env');
const {
  createResetToken,
  hashResetToken,
  isResetTokenFormatValid,
  sendPasswordResetEmail,
  validateNewPassword,
} = require('../src/services/passwordResetService');

test('creates random reset tokens and stores only deterministic hashes', () => {
  const first = createResetToken();
  const second = createResetToken();

  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.match(first.tokenHash, /^[a-f0-9]{64}$/);
  assert.notEqual(first.token, first.tokenHash);
  assert.notEqual(first.token, second.token);
  assert.equal(hashResetToken(first.token), first.tokenHash);
  assert.equal(isResetTokenFormatValid(first.token), true);
  assert.equal(isResetTokenFormatValid('short-token'), false);
});
test('enforces password reset length boundaries', () => {
  assert.equal(validateNewPassword('safe-pass-123'), 'safe-pass-123');
  assert.throws(() => validateNewPassword('short'), /at least 8/);
  assert.throws(() => validateNewPassword('x'.repeat(129)), /cannot exceed 128/);
});

test('sends reset email through the configured HTTPS provider without exposing configuration', async (t) => {
  const original = {
    resendApiKey: env.resendApiKey,
    passwordResetFromEmail: env.passwordResetFromEmail,
    frontendUrl: env.frontendUrl,
    passwordResetExpiresMinutes: env.passwordResetExpiresMinutes,
    passwordResetEmailConfigured: env.passwordResetEmailConfigured,
  };
  const originalFetch = global.fetch;
  Object.assign(env, {
    resendApiKey: 're_test_secret',
    passwordResetFromEmail: 'no-reply@example.com',
    frontendUrl: 'https://app.example.com',
    passwordResetExpiresMinutes: 30,
    passwordResetEmailConfigured: true,
  });
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ id: 'email-1' }) };
  };
  t.after(() => {
    Object.assign(env, original);
    global.fetch = originalFetch;
  });

  const result = await sendPasswordResetEmail({
    to: 'person@example.com',
    name: 'Test Person',
    token: 'a'.repeat(64),
    idempotencyKey: 'b'.repeat(64),
  });

  assert.equal(result.id, 'email-1');
  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.options.headers.Authorization, 'Bearer re_test_secret');
  const body = JSON.parse(request.options.body);
  assert.deepEqual(body.to, ['person@example.com']);
  assert.match(body.text, /reset-password\?token=a{64}/);
});
