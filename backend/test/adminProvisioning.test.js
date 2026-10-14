const assert = require('node:assert/strict');
const test = require('node:test');

const { readAdminAccounts } = require('../src/utils/adminProvisioning');

const validEnvironment = () => ({
  ADMIN_1_NAME: 'Administrator One',
  ADMIN_1_EMAIL: 'ADMIN1@VAU.AC.LK',
  ADMIN_1_PHONE: '0700000001',
  ADMIN_1_PASSWORD: 'strong-password-one',
  ADMIN_2_NAME: 'Administrator Two',
  ADMIN_2_EMAIL: 'admin2@vau.ac.lk',
  ADMIN_2_PHONE: '0700000002',
  ADMIN_2_PASSWORD: 'strong-password-two',
  ADMIN_3_NAME: 'Administrator Three',
  ADMIN_3_EMAIL: 'admin3@vau.ac.lk',
  ADMIN_3_PHONE: '0700000003',
  ADMIN_3_PASSWORD: 'strong-password-three',
});

test('reads and normalizes exactly three administrator accounts', () => {
  const accounts = readAdminAccounts(validEnvironment());

  assert.equal(accounts.length, 3);
  assert.equal(accounts[0].email, 'admin1@vau.ac.lk');
  assert.equal(accounts[2].name, 'Administrator Three');
});

test('rejects incomplete administrator configuration', () => {
  const environment = validEnvironment();
  delete environment.ADMIN_2_PHONE;

  assert.throws(
    () => readAdminAccounts(environment),
    /Missing environment variables: ADMIN_2_PHONE/
  );
});

test('rejects duplicate emails and weak passwords before database access', () => {
  const duplicateEnvironment = validEnvironment();
  duplicateEnvironment.ADMIN_3_EMAIL = duplicateEnvironment.ADMIN_1_EMAIL;
  assert.throws(
    () => readAdminAccounts(duplicateEnvironment),
    /email addresses must be unique/
  );

  const weakPasswordEnvironment = validEnvironment();
  weakPasswordEnvironment.ADMIN_1_PASSWORD = 'too-short';
  assert.throws(
    () => readAdminAccounts(weakPasswordEnvironment),
    /ADMIN_1_PASSWORD must contain at least 12 characters/
  );
});
