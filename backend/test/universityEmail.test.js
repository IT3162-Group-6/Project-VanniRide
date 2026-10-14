const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_registration_tests_123456';
process.env.ROUTING_BASE_URL =
  process.env.ROUTING_BASE_URL || 'http://routing.test';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/userModel');

const TEST_DATABASE_URI =
  process.env.MONGODB_TEST_URI ||
  'mongodb://127.0.0.1:27017/vanniRideDB_test';

let server;
let serverPort;

const ensureConnected = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DATABASE_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  }
};

const httpRequest = (method, endpoint, body) =>
  new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: serverPort,
        path: endpoint,
        method,
        headers: {
          Accept: 'application/json',
          ...(dataString
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(dataString),
              }
            : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });

const createdUserIds = [];

test.before(async () => {
  await ensureConnected();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  serverPort = server.address().port;
});

test.beforeEach(async () => {
  await ensureConnected();
});

test.after(async () => {
  try {
    if (mongoose.connection.readyState !== 0 && createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
  } catch {
    // Ignore cleanup errors on disconnected state
  }
  if (server?.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test('Valid @vau.ac.lk registration succeeds', async () => {
  const email = `customer.demo01.${Date.now()}@vau.ac.lk`;
  const res = await httpRequest('POST', '/api/auth/register', {
    name: 'Customer Demo',
    email,
    phone: '0711111111',
    password: 'Password123!',
    role: 'CUSTOMER',
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.user.email, email.toLowerCase());
  createdUserIds.push(res.body.data.user.id);
});

test('Uppercase domain and surrounding spaces are handled correctly', async () => {
  const uniqueId = Date.now();
  const rawEmail = `  rider.demo01.${uniqueId}@VAU.AC.LK  `;
  const res = await httpRequest('POST', '/api/auth/register', {
    name: 'Rider Demo',
    email: rawEmail,
    phone: '0722222222',
    password: 'Password123!',
    role: 'RIDER',
    vehicle: {
      type: 'Motorcycle',
      model: 'Honda Dio',
      registrationNumber: `NP-TEST-${uniqueId}`,
      color: 'Blue',
    },
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.user.email, `rider.demo01.${uniqueId}@vau.ac.lk`);
  createdUserIds.push(res.body.data.user.id);
});

test('Non-university and deceptive domains are rejected', async () => {
  const invalidEmails = [
    'user@gmail.com',
    'user@vau.ac.lk.example.com',
    '@vau.ac.lk',
    'user@otheruniversity.ac.lk',
  ];

  for (const email of invalidEmails) {
    const res = await httpRequest('POST', '/api/auth/register', {
      name: 'Invalid Test User',
      email,
      phone: '0733333333',
      password: 'Password123!',
      role: 'CUSTOMER',
    });

    assert.equal(res.status, 400);
    assert.equal(
      res.body.message,
      'Please use your University of Vavuniya email address (@vau.ac.lk).'
    );
  }
});

test('An existing non-university development account can still log in', async () => {
  await ensureConnected();
  const devEmail = `dev.old.${Date.now()}@test.com`;
  const rawPassword = 'OldPassword123!';
  const user = await User.create({
    name: 'Legacy Dev User',
    email: devEmail,
    phone: '0744444444',
    password_hash: await bcrypt.hash(rawPassword, 4),
    role: 'CUSTOMER',
    account_status: 'ACTIVE',
    token_version: 0,
  });
  createdUserIds.push(user._id);

  const res = await httpRequest('POST', '/api/auth/login', {
    email: devEmail,
    password: rawPassword,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.token);
  assert.equal(res.body.data.user.email, devEmail);
});
