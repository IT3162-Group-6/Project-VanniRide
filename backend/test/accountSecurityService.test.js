const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SECURITY_QUESTIONS,
  hashRecoveryValue,
  maskIdentityNumber,
  normalizeIdentityNumber,
  normalizeSecurityAnswer,
  recoveryValueMatches,
  validateIdentityNumber,
  validateSecurityQuestion,
} = require('../src/services/accountSecurityService');

test('normalizes national identity values without weakening exact matching', async () => {
  assert.equal(normalizeIdentityNumber(' 2001 2345 6789 '), '200123456789');
  assert.equal(normalizeSecurityAnswer('  Vavuniya   College  '), 'vavuniya college');
  assert.equal(maskIdentityNumber('200123456789'), '********6789');
  assert.equal(validateIdentityNumber('200123456789'), '200123456789');
  assert.equal(validateIdentityNumber('901234567V'), '901234567V');
  assert.throws(() => validateIdentityNumber('ST-2026-001'), /National ID number/);

  const hash = await hashRecoveryValue(normalizeSecurityAnswer('My First School'));
  assert.equal(await recoveryValueMatches('my first school', hash), true);
  assert.equal(await recoveryValueMatches('another school', hash), false);
});

test('only accepts an approved security question identifier', () => {
  assert.ok(SECURITY_QUESTIONS.length >= 4);
  assert.equal(validateSecurityQuestion(SECURITY_QUESTIONS[0].id), SECURITY_QUESTIONS[0].id);
  assert.throws(() => validateSecurityQuestion('custom-secret-question'), /valid security question/);
});
