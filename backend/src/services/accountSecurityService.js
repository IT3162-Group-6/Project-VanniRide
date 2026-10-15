const bcrypt = require('bcryptjs');

const SECURITY_QUESTIONS = Object.freeze([
  { id: 'birth_place', label: 'In which city or town were you born?' },
  { id: 'first_school', label: 'What was the name of your first school?' },
  { id: 'childhood_friend', label: 'What is the first name of a childhood friend?' },
  { id: 'favorite_teacher', label: 'What was the surname of your favorite teacher?' },
  { id: 'memorable_place', label: 'What place did you visit on a memorable trip?' },
]);

const SECURITY_QUESTION_IDS = new Set(SECURITY_QUESTIONS.map(({ id }) => id));
const DUMMY_RECOVERY_HASH = bcrypt.hashSync('vanni-ride-dummy-recovery-value', 12);

const normalizeIdentityNumber = (value) =>
  String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const normalizeSecurityAnswer = (value) =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const validateIdentityNumber = (value) => {
  const normalized = normalizeIdentityNumber(value);
  if (normalized.length < 4 || normalized.length > 32) {
    throw new Error('ID number must contain from 4 through 32 letters or numbers');
  }
  return normalized;
};

const validateSecurityQuestion = (value) => {
  const question = String(value || '').trim();
  if (!SECURITY_QUESTION_IDS.has(question)) {
    throw new Error('Please select a valid security question');
  }
  return question;
};

const validateSecurityAnswer = (value) => {
  const normalized = normalizeSecurityAnswer(value);
  if (normalized.length < 2 || normalized.length > 100) {
    throw new Error('Security answer must contain from 2 through 100 characters');
  }
  return normalized;
};

const hashRecoveryValue = (value) => bcrypt.hash(value, 12);
const recoveryValueMatches = (value, hash) =>
  bcrypt.compare(value, hash || DUMMY_RECOVERY_HASH);

const maskIdentityNumber = (value) => {
  const normalized = normalizeIdentityNumber(value);
  if (normalized.length <= 4) return normalized;
  return `${'*'.repeat(Math.max(2, normalized.length - 4))}${normalized.slice(-4)}`;
};

const questionLabel = (id) =>
  SECURITY_QUESTIONS.find((question) => question.id === id)?.label || 'Security question';

module.exports = {
  SECURITY_QUESTIONS,
  hashRecoveryValue,
  maskIdentityNumber,
  normalizeIdentityNumber,
  normalizeSecurityAnswer,
  questionLabel,
  recoveryValueMatches,
  validateIdentityNumber,
  validateSecurityAnswer,
  validateSecurityQuestion,
};
