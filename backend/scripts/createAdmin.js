const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('../src/config/env');
const User = require('../src/models/userModel');
const { readAdminAccounts } = require('../src/utils/adminProvisioning');

const createAdmins = async () => {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is required');
  }

  const accounts = readAdminAccounts();

  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });

  const existingUsers = await User.find({
    email: { $in: accounts.map((account) => account.email) },
  }).select('+password_hash');
  const existingByEmail = new Map(
    existingUsers.map((user) => [user.email, user])
  );
  const conflictingUser = existingUsers.find((user) => user.role !== 'ADMIN');
  if (conflictingUser) {
    throw new Error(
      `${conflictingUser.email} belongs to a non-admin account`
    );
  }

  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const existingUser = existingByEmail.get(account.email);
    if (existingUser) {
      existingUser.name = account.name;
      existingUser.phone = account.phone;
      existingUser.password_hash = passwordHash;
      existingUser.account_status = 'ACTIVE';
      existingUser.token_version += 1;
      await existingUser.save();
      console.log(`Administrator updated: ${account.email}`);
      continue;
    }

    await User.create({
      name: account.name,
      email: account.email,
      phone: account.phone,
      password_hash: passwordHash,
      role: 'ADMIN',
      account_status: 'ACTIVE',
      token_version: 0,
    });
    console.log(`Administrator created: ${account.email}`);
  }
};

if (require.main === module) {
  createAdmins()
    .catch((error) => {
      console.error(`Administrator setup failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = { createAdmins };
