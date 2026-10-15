const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SECURITY_QUESTIONS,
  hashRecoveryValue,
  maskIdentityNumber,
  normalizeIdentityNumber,
  normalizeSecurityAnswer,
  recoveryValueMatches,
  validateSecurityQuestion,
} = require('../src/services/accountSecurityService');

test('normalizes recovery identity values without weakening exact matching', async () => {
  assert.equal(normalizeIdentityNumber(' st-2026 / 001 '), 'ST2026001');
  assert.equal(normalizeSecurityAnswer('  Vavuniya   College  '), 'vavuniya college');
  assert.equal(maskIdentityNumber('ST2026001'), '*****6001');

  const hash = await hashRecoveryValue(normalizeSecurityAnswer('My First School'));
  assert.equal(await recoveryValueMatches('my first school', hash), true);
  assert.equal(await recoveryValueMatches('another school', hash), false);
});

test('only accepts an approved security question identifier', () => {
  assert.ok(SECURITY_QUESTIONS.length >= 4);
  assert.equal(validateSecurityQuestion(SECURITY_QUESTIONS[0].id), SECURITY_QUESTIONS[0].id);
  assert.throws(() => validateSecurityQuestion('custom-secret-question'), /valid security question/);
});
