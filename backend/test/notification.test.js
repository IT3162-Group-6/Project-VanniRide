const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_notification_tests_123456';
process.env.ROUTING_BASE_URL =
  process.env.ROUTING_BASE_URL || 'http://routing.test';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');
const User = require('../src/models/userModel');
const Notification = require('../src/models/notificationModel');

const TEST_DATABASE_URI =
  process.env.MONGODB_TEST_URI ||
  'mongodb://127.0.0.1:27017/vanniRideDB_test';

let server;
let serverPort;

const httpRequest = (method, endpoint, token, body) =>
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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
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

const createTestUser = async (overrides = {}) => {
  const user = await User.create({
    name: 'Test Student',
    email: `student.${Date.now()}.${Math.random().toString(36).slice(2)}@vau.ac.lk`,
    phone: '0712345678',
    password_hash: 'hashedpassword123',
    role: 'CUSTOMER',
    account_status: 'ACTIVE',
    token_version: 0,
    ...overrides,
  });
  createdUserIds.push(user._id);
  return user;
};

const tokenFor = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      tokenVersion: user.token_version,
    },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
};

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DATABASE_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  }
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  serverPort = server.address().port;
});

test.beforeEach(async () => {
  await Notification.deleteMany({});
});

test.after(async () => {
  await Notification.deleteMany({});
  if (createdUserIds.length > 0) {
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }
  if (server?.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (process.argv.some((arg) => arg.includes('notification.test.js'))) {
    await mongoose.disconnect();
  }
});

test('Unauthenticated users cannot call any notification endpoint', async () => {
  const dummyId = new mongoose.Types.ObjectId();

  const getRes = await httpRequest('GET', '/api/notifications');
  assert.equal(getRes.status, 401);

  const patchOneRes = await httpRequest(
    'PATCH',
    `/api/notifications/${dummyId}/read`
  );
  assert.equal(patchOneRes.status, 401);

  const patchAllRes = await httpRequest('PATCH', '/api/notifications/read-all');
  assert.equal(patchAllRes.status, 401);
});

test('A user receives only their own notifications, newest first', async () => {
  const userA = await createTestUser({ name: 'User A' });
  const userB = await createTestUser({ name: 'User B' });

  const olderDate = new Date(Date.now() - 60000);
  const newerDate = new Date();

  const notifAOlder = await Notification.create({
    recipient: userA._id,
    type: 'general',
    title: 'Older Notification',
    message: 'Message older',
    createdAt: olderDate,
    updatedAt: olderDate,
  });

  const notifANewer = await Notification.create({
    recipient: userA._id,
    type: 'ride_accepted',
    title: 'Newer Notification',
    message: 'Message newer',
    createdAt: newerDate,
    updatedAt: newerDate,
  });

  await Notification.create({
    recipient: userB._id,
    type: 'general',
    title: 'User B Notification',
    message: 'Private to User B',
  });

  const tokenA = tokenFor(userA);
  const res = await httpRequest('GET', '/api/notifications', tokenA);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.notifications.length, 2);
  assert.equal(res.body.data.notifications[0].id, notifANewer._id.toString());
  assert.equal(res.body.data.notifications[1].id, notifAOlder._id.toString());
  assert.ok(
    res.body.data.notifications.every(
      (n) => n.recipient === userA._id.toString()
    )
  );
});

test('Pagination and unreadCount are correct', async () => {
  const user = await createTestUser();
  const token = tokenFor(user);

  for (let i = 0; i < 5; i++) {
    await Notification.create({
      recipient: user._id,
      type: 'general',
      title: `Notice ${i + 1}`,
      message: `Content ${i + 1}`,
      isRead: i >= 3, // 3 unread (0, 1, 2) and 2 read (3, 4)
      createdAt: new Date(Date.now() + i * 1000),
    });
  }

  const page1 = await httpRequest('GET', '/api/notifications?page=1&limit=2', token);
  assert.equal(page1.status, 200);
  assert.equal(page1.body.data.notifications.length, 2);
  assert.equal(page1.body.data.unreadCount, 3);
  assert.equal(page1.body.data.pagination.page, 1);
  assert.equal(page1.body.data.pagination.limit, 2);
  assert.equal(page1.body.data.pagination.total, 5);
  assert.equal(page1.body.data.pagination.totalPages, 3);

  const page3 = await httpRequest('GET', '/api/notifications?page=3&limit=2', token);
  assert.equal(page3.status, 200);
  assert.equal(page3.body.data.notifications.length, 1);
  assert.equal(page3.body.data.unreadCount, 3);
});

test('A user can mark their own notification as read', async () => {
  const user = await createTestUser();
  const token = tokenFor(user);

  const notif = await Notification.create({
    recipient: user._id,
    type: 'ride_cancelled',
    title: 'Ride Cancelled',
    message: 'Your ride was cancelled',
    isRead: false,
  });

  const res = await httpRequest(
    'PATCH',
    `/api/notifications/${notif._id}/read`,
    token
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.notification.isRead, true);

  const updatedInDb = await Notification.findById(notif._id);
  assert.equal(updatedInDb.isRead, true);
});

test('A user cannot mark another user\'s notification as read', async () => {
  const userA = await createTestUser({ name: 'User A' });
  const userB = await createTestUser({ name: 'User B' });
  const tokenA = tokenFor(userA);

  const notifB = await Notification.create({
    recipient: userB._id,
    type: 'chat_approved',
    title: 'Chat Approved',
    message: 'Chat request approved',
    isRead: false,
  });

  const res = await httpRequest(
    'PATCH',
    `/api/notifications/${notifB._id}/read`,
    tokenA
  );
  assert.equal(res.status, 404);

  const unchangedInDb = await Notification.findById(notifB._id);
  assert.equal(unchangedInDb.isRead, false);
});

test('Mark-all-read changes only the signed-in user\'s notifications', async () => {
  const userA = await createTestUser({ name: 'User A' });
  const userB = await createTestUser({ name: 'User B' });
  const tokenA = tokenFor(userA);

  await Notification.create({
    recipient: userA._id,
    type: 'general',
    title: 'A1',
    message: 'A1 msg',
    isRead: false,
  });
  await Notification.create({
    recipient: userA._id,
    type: 'general',
    title: 'A2',
    message: 'A2 msg',
    isRead: false,
  });
  await Notification.create({
    recipient: userB._id,
    type: 'general',
    title: 'B1',
    message: 'B1 msg',
    isRead: false,
  });

  const res = await httpRequest('PATCH', '/api/notifications/read-all', tokenA);
  assert.equal(res.status, 200);
  assert.equal(res.body.updatedCount, 2);

  const unreadA = await Notification.countDocuments({
    recipient: userA._id,
    isRead: false,
  });
  assert.equal(unreadA, 0);

  const unreadB = await Notification.countDocuments({
    recipient: userB._id,
    isRead: false,
  });
  assert.equal(unreadB, 1);
});
