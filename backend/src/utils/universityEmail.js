const normalizeDomain = (value) =>
  String(value || '').trim().toLowerCase().replace(/^@+/, '');

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const isUniversityEmail = (email, domain) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedDomain = normalizeDomain(domain);
  const parts = normalizedEmail.split('@');
  return Boolean(
    normalizedDomain &&
    parts.length === 2 &&
    parts[0] &&
    !/\s/.test(parts[0]) &&
    parts[1] === normalizedDomain
  );
};

const registrationEmailIsAllowed = (email, config) =>
  isValidEmail(email) &&
  (Boolean(config.allowNonUniversityEmails) ||
    isUniversityEmail(email, config.universityEmailDomain));

module.exports = {
  isValidEmail,
  isUniversityEmail,
  normalizeDomain,
  registrationEmailIsAllowed,
};
