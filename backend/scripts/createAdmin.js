const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('../src/config/env');
const User = require('../src/models/userModel');

const requiredEnvironment = [
  'ADMIN_NAME',
  'ADMIN_EMAIL',
  'ADMIN_PHONE',
  'ADMIN_PASSWORD',
];

const createAdmin = async () => {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is required');
  }

  const missing = requiredEnvironment.filter(
    (name) => !String(process.env[name] || '').trim()
  );
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  if (process.env.ADMIN_PASSWORD.length < 10) {
    throw new Error('ADMIN_PASSWORD must contain at least 10 characters');
  }

  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });

  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const existingUser = await User.findOne({ email }).select('+password_hash');
  if (existingUser && existingUser.role !== 'ADMIN') {
    throw new Error('That email belongs to a non-admin account');
  }

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

  if (existingUser) {
    existingUser.name = process.env.ADMIN_NAME.trim();
    existingUser.phone = process.env.ADMIN_PHONE.trim();
    existingUser.password_hash = passwordHash;
    existingUser.account_status = 'ACTIVE';
    existingUser.token_version += 1;
    await existingUser.save();
    console.log(`Administrator updated: ${email}`);
    return;
  }

  await User.create({
    name: process.env.ADMIN_NAME.trim(),
    email,
    phone: process.env.ADMIN_PHONE.trim(),
    password_hash: passwordHash,
    role: 'ADMIN',
    account_status: 'ACTIVE',
    token_version: 0,
  });

  console.log(`Administrator created: ${email}`);
};

createAdmin()
  .catch((error) => {
    console.error(`Administrator setup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
