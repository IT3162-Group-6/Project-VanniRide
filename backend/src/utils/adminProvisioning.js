const { isValidEmail } = require('./universityEmail');

const ADMIN_SLOTS = [1, 2, 3];
const ADMIN_FIELDS = ['NAME', 'EMAIL', 'PHONE', 'PASSWORD'];

const readAdminAccounts = (environment = process.env) => {
  const missing = [];
  const accounts = ADMIN_SLOTS.map((slot) => {
    const values = Object.fromEntries(
      ADMIN_FIELDS.map((field) => {
        const variable = `ADMIN_${slot}_${field}`;
        const value = String(environment[variable] || '').trim();
        if (!value) missing.push(variable);
        return [field.toLowerCase(), value];
      })
    );
    return { slot, ...values, email: values.email.toLowerCase() };
  });

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  const emails = accounts.map((account) => account.email);
  if (new Set(emails).size !== emails.length) {
    throw new Error('Administrator email addresses must be unique');
  }

  accounts.forEach((account) => {
    if (!isValidEmail(account.email)) {
      throw new Error(
        `ADMIN_${account.slot}_EMAIL must be a valid email address`
      );
    }
    if (account.password.length < 12) {
      throw new Error(
        `ADMIN_${account.slot}_PASSWORD must contain at least 12 characters`
      );
    }
  });

  return accounts;
};

module.exports = { readAdminAccounts };
