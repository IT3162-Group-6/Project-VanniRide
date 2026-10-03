const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const path = require('path');
process.env.ROUTING_BASE_URL =
  process.env.ROUTING_BASE_URL || 'http://routing.test';
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server: SocketServer } = require('socket.io');
const { io: createSocketClient } = require('socket.io-client');
const rideController = require('../src/controllers/rideController');
const paymentController = require('../src/controllers/paymentController');
const chatController = require('../src/controllers/chatController');
const ratingController = require('../src/controllers/ratingController');
const adminController = require('../src/controllers/adminController');
const authController = require('../src/controllers/authController');
const historyController = require('../src/controllers/historyController');
const mapController = require('../src/controllers/mapController');
const userController = require('../src/controllers/userController');
const app = require('../src/app');
const env = require('../src/config/env');
const authRoutes = require('../src/routes/authRoutes');
const userRoutes = require('../src/routes/userRoutes');
const rideRoutes = require('../src/routes/rideRoutes');
const paymentRoutes = require('../src/routes/paymentRoutes');
const chatRoutes = require('../src/routes/chatRoutes');
const ratingRoutes = require('../src/routes/ratingRoutes');
const adminRoutes = require('../src/routes/adminRoutes');
const mapRoutes = require('../src/routes/mapRoutes');
const Ride = require('../src/models/rideModel');
const Rider = require('../src/models/riderModel');
const User = require('../src/models/userModel');
const Cancellation = require('../src/models/cancellationModel');
const CancellationRequest = require('../src/models/cancellationRequestModel');
const ChatAccessRequest = require('../src/models/chatAccessRequestModel');
const Payment = require('../src/models/paymentModel');
const Message = require('../src/models/messageModel');
const Rating = require('../src/models/ratingModel');
const AdminAuditLog = require('../src/models/adminAuditLogModel');
const initializeSocketHandler = require('../src/sockets/socketHandler');
const { calculateFare } = require('../src/utils/fareCalculator');
const {
  calculateRoadDistanceKm,
  calculateRoadRoute,
} = require('../src/services/routingService');
const {
  clearGeocodingCache,
  reverseGeocode,
  searchPlaces,
} = require('../src/services/geocodingService');

const TEST_DATABASE_URI =
  process.env.MONGODB_TEST_URI ||
  'mongodb://127.0.0.1:27017/vanniRideDB_test';
const originalFetch = global.fetch;

const routingResponse = (distances = [750]) => ({
  ok: true,
  json: async () => ({
    code: 'Ok',
    routes: distances.map((distance, index) => ({
      distance,
      duration: distance / 8,
      geometry: {
        type: 'LineString',
        coordinates: [
          [80.4982, 8.7581],
          [80.4971 + index * 0.00001, 8.7514],
        ],
      },
    })),
  }),
});

let riderFixtureSequence = 0;
const approvedRider = (userId, availabilityStatus = 'AVAILABLE') => ({
  user_id: userId,
  availability_status: availabilityStatus,
  vehicle: {
    type: 'Motorcycle',
    model: 'Test Model',
    registration_number: `TEST-${++riderFixtureSequence}`,
    color: 'Black',
  },
  approval_status: 'APPROVED',
  review_reason: 'Approved test fixture',
  reviewed_by: new mongoose.Types.ObjectId(),
  reviewed_at: new Date(),
});

const invokeController = (handler, req) =>
  new Promise((resolve, reject) => {
    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        resolve({ statusCode, body });
      },
    };

    handler(req, res, reject);
  });

const makeRequest = ({ user, body = {}, params = {}, query = {}, app }) => ({
  user,
  body,
  params,
  query,
  ...(app ? { app } : {}),
});

test.before(async () => {
  global.fetch = async () => routingResponse();
  await mongoose.connect(TEST_DATABASE_URI, { serverSelectionTimeoutMS: 5000 });
});

test.beforeEach(async () => {
  riderFixtureSequence = 0;
  await Promise.all([
    Ride.deleteMany({}),
    Rider.deleteMany({}),
    User.deleteMany({}),
    Cancellation.deleteMany({}),
    CancellationRequest.deleteMany({}),
    ChatAccessRequest.deleteMany({}),
    Payment.deleteMany({}),
    Message.deleteMany({}),
    Rating.deleteMany({}),
    AdminAuditLog.deleteMany({}),
  ]);
});

test.after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  global.fetch = originalFetch;
});

test('uses the shortest returned road route to estimate the fare', async () => {
  const distanceKm = await calculateRoadDistanceKm(
    { latitude: 8.7581, longitude: 80.4982 },
    { latitude: 8.7514, longitude: 80.4971 },
    {
      baseUrl: 'http://routing.test',
      fetchImplementation: async () => routingResponse([920, 750, 810]),
    }
  );

  assert.equal(distanceKm, 0.75);
  assert.equal(calculateFare('TRANSPORT', distanceKm), 260);
  assert.equal(calculateFare('DELIVERY', distanceKm), 210);
});

test('returns map-ready road routes and caches geocoding provider results', async () => {
  const route = await calculateRoadRoute(
    { latitude: 8.7581, longitude: 80.4982 },
    { latitude: 8.7514, longitude: 80.4971 },
    {
      baseUrl: 'http://routing.test',
      fetchImplementation: async () => routingResponse([920, 750, 810]),
    }
  );
  assert.equal(route.distanceKm, 0.75);
  assert.equal(route.durationMinutes, 2);
  assert.equal(route.routeGeometry.type, 'LineString');

  clearGeocodingCache();
  let providerCalls = 0;
  const geocodingFetch = async (url) => {
    providerCalls += 1;
    const isReverse = new URL(url).pathname.endsWith('/reverse');
    return {
      ok: true,
      status: 200,
      json: async () =>
        isReverse
          ? {
              place_id: 2,
              display_name: 'Vavuniya Town',
              lat: '8.7514',
              lon: '80.4971',
            }
          : [
              {
                place_id: 1,
                display_name: 'University of Vavuniya',
                lat: '8.7581',
                lon: '80.4982',
              },
            ],
    };
  };
  const geocodingOptions = {
    baseUrl: 'https://geocoding.test',
    userAgent: 'VanniRide test suite',
    minIntervalMs: 0,
    cacheTtlMs: 60_000,
    fetchImplementation: geocodingFetch,
  };
  const firstSearch = await searchPlaces('University', geocodingOptions);
  const secondSearch = await searchPlaces('University', geocodingOptions);
  const reverse = await reverseGeocode(8.7514, 80.4971, geocodingOptions);
  assert.equal(firstSearch[0].displayName, 'University of Vavuniya');
  assert.deepEqual(secondSearch, firstSearch);
  assert.equal(reverse.displayName, 'Vavuniya Town');
  assert.equal(providerCalls, 2);

  const preview = await invokeController(
    mapController.previewRoute,
    makeRequest({
      user: { id: new mongoose.Types.ObjectId().toString(), role: 'CUSTOMER' },
      body: {
        rideType: 'TRANSPORT',
        pickupLocation: {
          address: 'University of Vavuniya',
          latitude: 8.7581,
          longitude: 80.4982,
        },
        destination: {
          address: 'Vavuniya Town',
          latitude: 8.7514,
          longitude: 80.4971,
        },
      },
    })
  );
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.body.data.routePreview.distanceKm, 0.75);
  assert.equal(preview.body.data.routePreview.estimatedFare, 260);
  assert.equal(preview.body.data.routePreview.routeGeometry.type, 'LineString');
});

test('requires rider approval and resubmits changed vehicle details for review', async () => {
  const adminId = new mongoose.Types.ObjectId();
  await User.create({
    _id: adminId,
    name: 'Rider Review Admin',
    email: 'rider-review-admin@example.com',
    phone: '0700001400',
    password_hash: 'test-password-hash',
    role: 'ADMIN',
    account_status: 'ACTIVE',
  });

  const registration = await invokeController(
    authController.register,
    makeRequest({
      body: {
        name: 'Approval Rider',
        email: 'approval-rider@example.com',
        phone: '0700001401',
        password: 'Password123!',
        role: 'RIDER',
        vehicle: {
          type: 'Motorcycle',
          model: 'Honda Dio',
          registrationNumber: 'NP-ABC-1401',
          color: 'Blue',
        },
      },
    })
  );
  const riderUserId = registration.body.data.user.id;
  assert.equal(registration.statusCode, 201);
  assert.equal(registration.body.data.riderProfile.approvalStatus, 'PENDING');
  assert.equal(registration.body.data.riderProfile.availabilityStatus, 'UNAVAILABLE');

  await assert.rejects(
    invokeController(
      userController.updateRiderAvailability,
      makeRequest({
        user: { _id: riderUserId, role: 'RIDER' },
        body: { availabilityStatus: 'AVAILABLE' },
      })
    ),
    (error) => error.statusCode === 403
  );

  const emitted = [];
  const io = {
    to() {
      return this;
    },
    emit(event, payload) {
      emitted.push({ event, payload });
    },
  };
  const approval = await invokeController(
    adminController.reviewRiderApproval,
    makeRequest({
      user: { id: adminId.toString(), role: 'ADMIN' },
      params: { riderUserId },
      body: { decision: 'APPROVE', reason: 'Vehicle documents verified' },
      app: { get: () => io },
    })
  );
  assert.equal(approval.body.data.riderProfile.approvalStatus, 'APPROVED');
  assert.ok(emitted.some(({ event }) => event === 'rider_approval_updated'));
  assert.equal(
    await AdminAuditLog.countDocuments({ action: 'RIDER_APPROVAL_REVIEWED' }),
    1
  );

  const availability = await invokeController(
    userController.updateRiderAvailability,
    makeRequest({
      user: { _id: riderUserId, role: 'RIDER' },
      body: { availabilityStatus: 'AVAILABLE' },
    })
  );
  assert.equal(availability.body.data.riderProfile.availabilityStatus, 'AVAILABLE');

  const changedVehicle = await invokeController(
    userController.updateRiderProfile,
    makeRequest({
      user: { _id: riderUserId, role: 'RIDER' },
      body: {
        vehicle: {
          type: 'Motorcycle',
          model: 'Honda Dio',
          registrationNumber: 'NP-ABC-1402',
          color: 'Red',
        },
      },
    })
  );
  assert.equal(changedVehicle.body.data.reapprovalTriggered, true);
  assert.equal(changedVehicle.body.data.riderProfile.approvalStatus, 'PENDING');
  assert.equal(changedVehicle.body.data.riderProfile.availabilityStatus, 'UNAVAILABLE');
});

test('audits admin conversation access and force cancellation without using participant allowances', async () => {
  const adminId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const riderUserId = new mongoose.Types.ObjectId();
  await User.create([
    {
      _id: adminId,
      name: 'Operations Admin',
      email: 'operations-admin@example.com',
      phone: '0700001500',
      password_hash: 'test-password-hash',
      role: 'ADMIN',
      account_status: 'ACTIVE',
    },
    {
      _id: customerId,
      name: 'Force Cancel Customer',
      email: 'force-cancel-customer@example.com',
      phone: '0700001501',
      password_hash: 'test-password-hash',
      role: 'CUSTOMER',
      account_status: 'ACTIVE',
    },
    {
      _id: riderUserId,
      name: 'Force Cancel Rider',
      email: 'force-cancel-rider@example.com',
      phone: '0700001502',
      password_hash: 'test-password-hash',
      role: 'RIDER',
      account_status: 'ACTIVE',
    },
  ]);
  await Rider.create(approvedRider(riderUserId, 'BUSY'));
  const ride = await Ride.create({
    customer_id: customerId,
    rider_id: riderUserId,
    request_type: 'TRANSPORT',
    pickup_location: { address: 'A', latitude: 8.75, longitude: 80.49 },
    destination: { address: 'B', latitude: 8.76, longitude: 80.5 },
    distance_km: 2,
    fare_amount: 360,
    status: 'STARTED',
    accepted_at: new Date(),
    arrived_at: new Date(),
    started_at: new Date(),
  });
  await Message.create([
    { ride_id: ride._id, sender_id: customerId, message_text: 'Private pickup note' },
    { ride_id: ride._id, sender_id: riderUserId, message_text: 'I have arrived' },
  ]);
  await CancellationRequest.create({
    ride_id: ride._id,
    requested_by: customerId,
    responding_user_id: riderUserId,
    reason: 'Please confirm',
    status: 'PENDING',
    expires_at: new Date(Date.now() + 15 * 60 * 1000),
  });

  const messageResult = await invokeController(
    adminController.getRideMessages,
    makeRequest({
      user: { id: adminId.toString(), role: 'ADMIN' },
      params: { rideId: ride._id.toString() },
      query: { reason: 'Investigating a reported safety concern', limit: '10' },
    })
  );
  assert.equal(messageResult.body.results, 2);
  const viewAudit = await AdminAuditLog.findOne({ action: 'RIDE_MESSAGES_VIEWED' }).lean();
  assert.ok(viewAudit);
  assert.equal(JSON.stringify(viewAudit).includes('Private pickup note'), false);

  const emitted = [];
  const io = {
    to() {
      return this;
    },
    emit(event, payload) {
      emitted.push({ event, payload });
    },
  };
  const cancelled = await invokeController(
    adminController.forceCancelRide,
    makeRequest({
      user: { id: adminId.toString(), role: 'ADMIN' },
      params: { rideId: ride._id.toString() },
      body: { reason: 'Safety intervention by operations' },
      app: { get: () => io },
    })
  );
  assert.equal(cancelled.body.data.ride.status, 'CANCELLED');
  assert.equal(cancelled.body.data.cancellation.cancellationMode, 'ADMIN_FORCE');
  assert.equal(
    (await CancellationRequest.findOne({ ride_id: ride._id }).lean()).status,
    'ADMIN_CANCELLED'
  );
  assert.equal(
    (await Rider.findOne({ user_id: riderUserId }).lean()).availability_status,
    'AVAILABLE'
  );
  assert.equal(
    await Cancellation.countDocuments({ cancelled_by: { $in: [customerId, riderUserId] } }),
    0
  );
  assert.equal(await AdminAuditLog.countDocuments({ action: 'RIDE_FORCE_CANCELLED' }), 1);
  assert.ok(emitted.some(({ event }) => event === 'ride_force_cancelled'));
});

test('completes the ordered ride lifecycle and releases the rider', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const riderUserId = new mongoose.Types.ObjectId();
  const competingRiderUserId = new mongoose.Types.ObjectId();

  await Rider.create([
    approvedRider(riderUserId),
    approvedRider(competingRiderUserId),
  ]);
  await User.create([
    {
      _id: riderUserId,
      name: 'Lifecycle Rider',
      email: 'lifecycle-rider@example.com',
      phone: '0700001001',
      password_hash: 'test-password-hash',
      role: 'RIDER',
      account_status: 'ACTIVE',
      token_version: 0,
    },
    {
      _id: competingRiderUserId,
      name: 'Competing Rider',
      email: 'competing-rider@example.com',
      phone: '0700001002',
      password_hash: 'test-password-hash',
      role: 'RIDER',
      account_status: 'ACTIVE',
      token_version: 0,
    },
  ]);

  const createResult = await invokeController(
    rideController.requestRide,
    makeRequest({
      user: { id: customerId.toString(), role: 'CUSTOMER' },
      body: {
        rideType: 'TRANSPORT',
        pickupLocation: {
          address: 'University of Vavuniya',
          latitude: 8.7581,
          longitude: 80.4982,
        },
        destination: {
          address: 'Vavuniya Town',
          latitude: 8.7514,
          longitude: 80.4971,
        },
      },
    })
  );

  assert.equal(createResult.statusCode, 201);
  assert.equal(createResult.body.data.ride.status, 'REQUESTED');
  const rideId = createResult.body.data.ride.id;

  const pendingPayment = await Payment.findOne({ ride_id: rideId }).lean();
  assert.equal(pendingPayment.payment_method, 'CASH');
  assert.equal(pendingPayment.payment_status, 'PENDING');

  const availableResult = await invokeController(
    rideController.getAvailableRides,
    makeRequest({ user: { id: riderUserId.toString(), role: 'RIDER' } })
  );
  assert.equal(availableResult.body.results, 1);

  const acceptResult = await invokeController(
    rideController.acceptRide,
    makeRequest({
      user: { id: riderUserId.toString(), role: 'RIDER' },
      params: { rideId },
    })
  );
  assert.equal(acceptResult.body.data.ride.status, 'ACCEPTED');

  const emittedMessages = [];
  const mockIo = {
    room: null,
    to(room) {
      this.room = room;
      return this;
    },
    emit(event, payload) {
      emittedMessages.push({ room: this.room, event, payload });
    },
  };
  const messageResult = await invokeController(
    chatController.sendMessage,
    makeRequest({
      user: { id: customerId.toString(), role: 'CUSTOMER' },
      params: { rideId },
      body: { messageText: 'I am waiting near the main gate.' },
      app: { get: (key) => (key === 'io' ? mockIo : null) },
    })
  );
  assert.equal(messageResult.statusCode, 201);
  assert.equal(
    messageResult.body.data.message.messageText,
    'I am waiting near the main gate.'
  );
  assert.equal(emittedMessages.length, 1);
  assert.equal(emittedMessages[0].room, `ride_${rideId}`);
  assert.equal(emittedMessages[0].event, 'new_message');
  assert.equal(
    emittedMessages[0].payload.messageText,
    'I am waiting near the main gate.'
  );

  const historyResult = await invokeController(
    chatController.getMessages,
    makeRequest({
      user: { id: riderUserId.toString(), role: 'RIDER' },
      params: { rideId },
    })
  );
  assert.equal(historyResult.body.results, 1);

  await assert.rejects(
    invokeController(
      chatController.getMessages,
      makeRequest({
        user: { id: competingRiderUserId.toString(), role: 'RIDER' },
        params: { rideId },
      })
    ),
    (error) => error.statusCode === 403
  );

  await assert.rejects(
    invokeController(
      paymentController.markPaymentPaid,
      makeRequest({
        user: { id: riderUserId.toString(), role: 'RIDER' },
        params: { rideId },
      })
    ),
    (error) => error.statusCode === 409
  );

  await assert.rejects(
    invokeController(
      rideController.acceptRide,
      makeRequest({
        user: { id: competingRiderUserId.toString(), role: 'RIDER' },
        params: { rideId },
      })
    ),
    (error) => error.statusCode === 409
  );

  const competingRider = await Rider.findOne({
    user_id: competingRiderUserId,
  }).lean();
  assert.equal(competingRider.availability_status, 'AVAILABLE');

  await assert.rejects(
    invokeController(
      rideController.updateRideStatus,
      makeRequest({
        user: { id: riderUserId.toString(), role: 'RIDER' },
        params: { rideId },
        body: { status: 'STARTED' },
      })
    ),
    (error) => error.statusCode === 409
  );

  for (const status of ['ARRIVED', 'STARTED', 'COMPLETED']) {
    const result = await invokeController(
      rideController.updateRideStatus,
      makeRequest({
        user: { id: riderUserId.toString(), role: 'RIDER' },
        params: { rideId },
        body: { status },
      })
    );
    assert.equal(result.body.data.ride.status, status);
  }

  const rider = await Rider.findOne({ user_id: riderUserId }).lean();
  assert.equal(rider.availability_status, 'AVAILABLE');

  const paymentResult = await invokeController(
    paymentController.markPaymentPaid,
    makeRequest({
      user: { id: riderUserId.toString(), role: 'RIDER' },
      params: { rideId },
    })
  );
  assert.equal(paymentResult.body.data.payment.paymentMethod, 'CASH');
  assert.equal(paymentResult.body.data.payment.paymentStatus, 'PAID');
  assert.equal(paymentResult.body.data.payment.amount, 260);
  assert.equal(
    paymentResult.body.data.payment.confirmedBy,
    riderUserId.toString()
  );
  assert.ok(paymentResult.body.data.payment.createdAt);
  assert.ok(paymentResult.body.data.payment.paidAt);

  const storedPayment = await Payment.findOne({ ride_id: rideId }).lean();
  assert.equal(storedPayment.amount, 260);
  assert.ok(storedPayment.confirmed_by.equals(riderUserId));
  assert.ok(storedPayment.paid_at instanceof Date);

  await assert.rejects(
    invokeController(
      paymentController.markPaymentPaid,
      makeRequest({
        user: { id: riderUserId.toString(), role: 'RIDER' },
        params: { rideId },
      })
    ),
    (error) => error.statusCode === 409
  );

  const customerPaymentResult = await invokeController(
    paymentController.getPayment,
    makeRequest({
      user: { id: customerId.toString(), role: 'CUSTOMER' },
      params: { rideId },
    })
  );
  assert.equal(customerPaymentResult.body.data.payment.paymentStatus, 'PAID');
  assert.equal(customerPaymentResult.body.data.payment.amount, 260);
  assert.equal(
    customerPaymentResult.body.data.payment.confirmedBy,
    riderUserId.toString()
  );
});

test('prevents customers and unrelated riders from confirming cash payment', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const assignedRiderId = new mongoose.Types.ObjectId();
  const unrelatedRiderId = new mongoose.Types.ObjectId();
  const ride = await Ride.create({
    customer_id: customerId,
    rider_id: assignedRiderId,
    request_type: 'TRANSPORT',
    pickup_location: {
      address: 'Campus',
      latitude: 8.7581,
      longitude: 80.4982,
    },
    destination: {
      address: 'Town',
      latitude: 8.7514,
      longitude: 80.4971,
    },
    distance_km: 0.75,
    fare_amount: 260,
    status: 'COMPLETED',
    accepted_at: new Date(),
    arrived_at: new Date(),
    started_at: new Date(),
    completed_at: new Date(),
  });
  await Payment.create({
    ride_id: ride._id,
    amount: 260,
    payment_method: 'CASH',
    payment_status: 'PENDING',
    confirmed_by: null,
    paid_at: null,
  });

  await assert.rejects(
    invokeController(
      paymentController.markPaymentPaid,
      makeRequest({
        user: { id: customerId.toString(), role: 'CUSTOMER' },
        params: { rideId: ride._id.toString() },
      })
    ),
    (error) => error.statusCode === 403
  );
  await assert.rejects(
    invokeController(
      paymentController.markPaymentPaid,
      makeRequest({
        user: { id: unrelatedRiderId.toString(), role: 'RIDER' },
        params: { rideId: ride._id.toString() },
      })
    ),
    (error) => error.statusCode === 403
  );

  const payment = await Payment.findOne({ ride_id: ride._id }).lean();
  assert.equal(payment.payment_status, 'PENDING');
  assert.equal(payment.confirmed_by, null);
  assert.equal(payment.paid_at, null);
});

test('cancels a requested ride without deleting its history', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const createResult = await invokeController(
    rideController.requestRide,
    makeRequest({
      user: { id: customerId.toString(), role: 'CUSTOMER' },
      body: {
        rideType: 'DELIVERY',
        deliveryCategory: 'PARCEL',
        pickupLocation: {
          address: 'Campus',
          latitude: 8.7581,
          longitude: 80.4982,
        },
        destination: {
          address: 'Town',
          latitude: 8.7514,
          longitude: 80.4971,
        },
      },
    })
  );
  const rideId = createResult.body.data.ride.id;

  await assert.rejects(
    invokeController(
      chatController.sendMessage,
      makeRequest({
        user: { id: customerId.toString(), role: 'CUSTOMER' },
        params: { rideId },
        body: { messageText: 'This ride has not been accepted.' },
      })
    ),
    (error) => error.statusCode === 409
  );

  const cancelResult = await invokeController(
    rideController.cancelRide,
    makeRequest({
      user: { id: customerId.toString(), role: 'CUSTOMER' },
      params: { rideId },
      body: { reason: 'Plans changed' },
    })
  );

  assert.equal(cancelResult.body.data.ride.status, 'CANCELLED');
  assert.equal(await Ride.countDocuments({ _id: rideId }), 1);
  assert.equal(await Cancellation.countDocuments({ ride_id: rideId }), 1);
});

test('requires the other participant to resolve a started cancellation', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const riderUserId = new mongoose.Types.ObjectId();
  await Rider.create(approvedRider(riderUserId, 'BUSY'));
  await User.create({
    _id: riderUserId,
    name: 'Cancellation Rider',
    email: 'cancellation-rider@example.com',
    phone: '0700002001',
    password_hash: 'test-password-hash',
    role: 'RIDER',
    account_status: 'ACTIVE',
    token_version: 0,
  });
  const ride = await Ride.create({
    customer_id: customerId,
    rider_id: riderUserId,
    request_type: 'TRANSPORT',
    pickup_location: {
      address: 'Campus',
      latitude: 8.7581,
      longitude: 80.4982,
    },
    destination: {
      address: 'Town',
      latitude: 8.7514,
      longitude: 80.4971,
    },
    distance_km: 0.75,
    fare_amount: 260,
    status: 'STARTED',
    accepted_at: new Date(),
    arrived_at: new Date(),
    started_at: new Date(),
  });

  const requestResult = await invokeController(
    rideController.cancelRide,
    makeRequest({
      user: { id: customerId.toString(), role: 'CUSTOMER' },
      params: { rideId: ride._id.toString() },
      body: { reason: 'Please stop the trip' },
    })
  );
  assert.equal(requestResult.statusCode, 202);
  assert.equal(
    requestResult.body.data.cancellationRequest.status,
    'PENDING'
  );
  assert.equal(
    requestResult.body.data.cancellationAllowance.pendingReservations,
    1
  );

  await assert.rejects(
    invokeController(
      rideController.respondToCancellation,
      makeRequest({
        user: { id: customerId.toString(), role: 'CUSTOMER' },
        params: { rideId: ride._id.toString() },
        body: { decision: 'CANCEL' },
      })
    ),
    (error) => error.statusCode === 403
  );

  const responseResult = await invokeController(
    rideController.respondToCancellation,
    makeRequest({
      user: { id: riderUserId.toString(), role: 'RIDER' },
      params: { rideId: ride._id.toString() },
      body: { decision: 'CANCEL' },
    })
  );
  assert.equal(responseResult.body.data.ride.status, 'CANCELLED');
  assert.equal(
    responseResult.body.data.cancellationRequest.status,
    'CONFIRMED'
  );

  const cancellation = await Cancellation.findOne({
    ride_id: ride._id,
  }).lean();
  assert.equal(cancellation.cancellation_mode, 'MUTUAL');
  const rider = await Rider.findOne({ user_id: riderUserId }).lean();
  assert.equal(rider.availability_status, 'AVAILABLE');
});

test('enforces five cancellations in the rolling one-hour window', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const now = new Date();
  await Cancellation.insertMany(
    Array.from({ length: 5 }, () => ({
      ride_id: new mongoose.Types.ObjectId(),
      cancelled_by: customerId,
      reason: 'Existing cancellation',
      previous_status: 'REQUESTED',
      cancellation_mode: 'IMMEDIATE',
      cancelled_at: now,
    }))
  );
  const ride = await Ride.create({
    customer_id: customerId,
    request_type: 'DELIVERY',
    delivery_category: 'PARCEL',
    pickup_location: {
      address: 'Campus',
      latitude: 8.7581,
      longitude: 80.4982,
    },
    destination: {
      address: 'Town',
      latitude: 8.7514,
      longitude: 80.4971,
    },
    distance_km: 0.75,
    fare_amount: 210,
    status: 'REQUESTED',
  });

  await assert.rejects(
    invokeController(
      rideController.cancelRide,
      makeRequest({
        user: { id: customerId.toString(), role: 'CUSTOMER' },
        params: { rideId: ride._id.toString() },
        body: { reason: 'One cancellation too many' },
      })
    ),
    (error) => error.statusCode === 409
  );
  assert.equal((await Ride.findById(ride._id).lean()).status, 'REQUESTED');
});

test('gates post-completion chat behind a customer request and active approval', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const riderUserId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const ride = await Ride.create({
    customer_id: customerId,
    rider_id: riderUserId,
    request_type: 'TRANSPORT',
    pickup_location: {
      address: 'Campus',
      latitude: 8.7581,
      longitude: 80.4982,
    },
    destination: {
      address: 'Town',
      latitude: 8.7514,
      longitude: 80.4971,
    },
    distance_km: 0.75,
    fare_amount: 260,
    status: 'COMPLETED',
    accepted_at: new Date(),
    arrived_at: new Date(),
    started_at: new Date(),
    completed_at: new Date(),
  });

  await assert.rejects(
    invokeController(
      chatController.requestPostCompletionAccess,
      makeRequest({
        user: { id: riderUserId.toString(), role: 'RIDER' },
        params: { rideId: ride._id.toString() },
        body: { reason: 'I need to contact the customer' },
      })
    ),
    (error) => error.statusCode === 403
  );

  const requestResult = await invokeController(
    chatController.requestPostCompletionAccess,
    makeRequest({
      user: { id: customerId.toString(), role: 'CUSTOMER' },
      params: { rideId: ride._id.toString() },
      body: { reason: 'I left an item in the vehicle' },
    })
  );
  assert.equal(requestResult.statusCode, 201);
  assert.equal(requestResult.body.data.chatAccessRequest.status, 'PENDING');

  const pendingHistory = await invokeController(
    chatController.getMessages,
    makeRequest({
      user: { id: customerId.toString(), role: 'CUSTOMER' },
      params: { rideId: ride._id.toString() },
    })
  );
  assert.equal(pendingHistory.body.data.chatAccess.canSend, false);
  assert.equal(pendingHistory.body.data.chatAccess.mode, 'READ_ONLY');
  assert.equal(
    pendingHistory.body.data.chatAccess.pendingRequest.status,
    'PENDING'
  );

  await assert.rejects(
    invokeController(
      chatController.sendMessage,
      makeRequest({
        user: { id: customerId.toString(), role: 'CUSTOMER' },
        params: { rideId: ride._id.toString() },
        body: { messageText: 'Did you find my item?' },
      })
    ),
    (error) => error.statusCode === 409
  );

  const now = new Date();
  await ChatAccessRequest.updateOne(
    { _id: requestResult.body.data.chatAccessRequest.id },
    {
      $set: {
        status: 'APPROVED',
        reviewed_by: adminId,
        reviewed_at: now,
        approved_from: new Date(now.getTime() - 1000),
        approved_until: new Date(now.getTime() + 60 * 60 * 1000),
      },
    }
  );

  const customerMessage = await invokeController(
    chatController.sendMessage,
    makeRequest({
      user: { id: customerId.toString(), role: 'CUSTOMER' },
      params: { rideId: ride._id.toString() },
      body: { messageText: 'Did you find my item?' },
    })
  );
  assert.equal(customerMessage.statusCode, 201);
  const riderMessage = await invokeController(
    chatController.sendMessage,
    makeRequest({
      user: { id: riderUserId.toString(), role: 'RIDER' },
      params: { rideId: ride._id.toString() },
      body: { messageText: 'Yes, please contact the administrator.' },
    })
  );
  assert.equal(riderMessage.statusCode, 201);

  const approvedHistory = await invokeController(
    chatController.getMessages,
    makeRequest({
      user: { id: riderUserId.toString(), role: 'RIDER' },
      params: { rideId: ride._id.toString() },
    })
  );
  assert.equal(approvedHistory.body.data.chatAccess.canSend, true);
  assert.equal(
    approvedHistory.body.data.chatAccess.mode,
    'POST_COMPLETION_APPROVAL'
  );
  assert.ok(approvedHistory.body.data.chatAccess.approvedUntil);

  await ChatAccessRequest.updateOne(
    { _id: requestResult.body.data.chatAccessRequest.id },
    { $set: { approved_until: new Date(Date.now() - 1000) } }
  );
  await assert.rejects(
    invokeController(
      chatController.sendMessage,
      makeRequest({
        user: { id: customerId.toString(), role: 'CUSTOMER' },
        params: { rideId: ride._id.toString() },
        body: { messageText: 'This should be blocked' },
      })
    ),
    (error) => error.statusCode === 409
  );

  const expiredRequest = await ChatAccessRequest.findById(
    requestResult.body.data.chatAccessRequest.id
  ).lean();
  assert.equal(expiredRequest.status, 'EXPIRED');
  const history = await invokeController(
    chatController.getMessages,
    makeRequest({
      user: { id: customerId.toString(), role: 'CUSTOMER' },
      params: { rideId: ride._id.toString() },
    })
  );
  assert.equal(history.body.results, 2);
  assert.equal(history.body.data.chatAccess.canSend, false);
  assert.equal(history.body.data.chatAccess.mode, 'READ_ONLY');
});

test('allows one customer rating per completed ride and summarizes the rider', async () => {
  const firstCustomerId = new mongoose.Types.ObjectId();
  const secondCustomerId = new mongoose.Types.ObjectId();
  const outsiderCustomerId = new mongoose.Types.ObjectId();
  const riderUserId = new mongoose.Types.ObjectId();
  await Rider.create(approvedRider(riderUserId));

  const rideData = (customerId) => ({
    customer_id: customerId,
    rider_id: riderUserId,
    request_type: 'TRANSPORT',
    pickup_location: {
      address: 'Campus',
      latitude: 8.7581,
      longitude: 80.4982,
    },
    destination: {
      address: 'Town',
      latitude: 8.7514,
      longitude: 80.4971,
    },
    distance_km: 0.75,
    fare_amount: 260,
    status: 'COMPLETED',
    accepted_at: new Date(),
    arrived_at: new Date(),
    started_at: new Date(),
    completed_at: new Date(),
  });
  const [firstRide, secondRide] = await Ride.create([
    rideData(firstCustomerId),
    rideData(secondCustomerId),
  ]);
  const activeRide = await Ride.create({
    ...rideData(firstCustomerId),
    status: 'STARTED',
    completed_at: null,
  });

  await assert.rejects(
    invokeController(
      ratingController.createRating,
      makeRequest({
        user: { id: outsiderCustomerId.toString(), role: 'CUSTOMER' },
        params: { rideId: firstRide._id.toString() },
        body: { rating: 5 },
      })
    ),
    (error) => error.statusCode === 403
  );
  await assert.rejects(
    invokeController(
      ratingController.createRating,
      makeRequest({
        user: { id: firstCustomerId.toString(), role: 'CUSTOMER' },
        params: { rideId: firstRide._id.toString() },
        body: { rating: '5' },
      })
    ),
    (error) => error.statusCode === 400
  );
  await assert.rejects(
    invokeController(
      ratingController.createRating,
      makeRequest({
        user: { id: firstCustomerId.toString(), role: 'CUSTOMER' },
        params: { rideId: activeRide._id.toString() },
        body: { rating: 5 },
      })
    ),
    (error) => error.statusCode === 409
  );
  await assert.rejects(
    invokeController(
      ratingController.createRating,
      makeRequest({
        user: { id: riderUserId.toString(), role: 'RIDER' },
        params: { rideId: firstRide._id.toString() },
        body: { rating: 5 },
      })
    ),
    (error) => error.statusCode === 403
  );

  const firstRating = await invokeController(
    ratingController.createRating,
    makeRequest({
      user: { id: firstCustomerId.toString(), role: 'CUSTOMER' },
      params: { rideId: firstRide._id.toString() },
      body: { rating: 5, review: '  Safe and friendly service  ' },
    })
  );
  assert.equal(firstRating.statusCode, 201);
  assert.equal(firstRating.body.data.rating.rating, 5);
  assert.equal(
    firstRating.body.data.rating.review,
    'Safe and friendly service'
  );

  await assert.rejects(
    invokeController(
      ratingController.createRating,
      makeRequest({
        user: { id: firstCustomerId.toString(), role: 'CUSTOMER' },
        params: { rideId: firstRide._id.toString() },
        body: { rating: 4 },
      })
    ),
    (error) => error.statusCode === 409
  );

  const secondRating = await invokeController(
    ratingController.createRating,
    makeRequest({
      user: { id: secondCustomerId.toString(), role: 'CUSTOMER' },
      params: { rideId: secondRide._id.toString() },
      body: { rating: 3 },
    })
  );
  assert.equal(secondRating.body.data.rating.review, null);

  const ratingsResult = await invokeController(
    ratingController.getRiderRatings,
    makeRequest({
      user: { id: outsiderCustomerId.toString(), role: 'CUSTOMER' },
      params: { riderId: riderUserId.toString() },
    })
  );
  assert.equal(ratingsResult.body.results, 2);
  assert.equal(ratingsResult.body.data.summary.totalRatings, 2);
  assert.equal(ratingsResult.body.data.summary.averageRating, 4);
  assert.deepEqual(
    ratingsResult.body.data.ratings
      .map((item) => item.rating)
      .sort((left, right) => left - right),
    [3, 5]
  );
});

test('audits bounded admin management, dispute, approval, and statistics operations', async () => {
  const adminId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const riderUserId = new mongoose.Types.ObjectId();
  await User.create([
    {
      _id: adminId,
      name: 'System Admin',
      email: 'phase11-admin@example.com',
      phone: '0700001101',
      password_hash: 'test-password-hash',
      role: 'ADMIN',
      account_status: 'ACTIVE',
      token_version: 0,
    },
    {
      _id: customerId,
      name: 'Managed Customer',
      email: 'phase11-customer@example.com',
      phone: '0700001102',
      password_hash: 'test-password-hash',
      role: 'CUSTOMER',
      account_status: 'ACTIVE',
      token_version: 0,
    },
    {
      _id: riderUserId,
      name: 'Managed Rider',
      email: 'phase11-rider@example.com',
      phone: '0700001103',
      password_hash: 'test-password-hash',
      role: 'RIDER',
      account_status: 'ACTIVE',
      token_version: 0,
    },
  ]);
  await Rider.create(approvedRider(riderUserId));

  const adminUser = { id: adminId.toString(), role: 'ADMIN' };
  const statusResult = await invokeController(
    adminController.updateUserStatus,
    makeRequest({
      user: adminUser,
      params: { userId: customerId.toString() },
      body: {
        accountStatus: 'SUSPENDED',
        reason: 'Repeated policy violation',
      },
    })
  );
  assert.equal(statusResult.body.data.user.accountStatus, 'SUSPENDED');
  const suspendedCustomer = await User.findById(customerId).lean();
  assert.equal(suspendedCustomer.account_status, 'SUSPENDED');
  assert.equal(suspendedCustomer.token_version, 1);
  await assert.rejects(
    invokeController(
      adminController.updateUserStatus,
      makeRequest({
        user: adminUser,
        params: { userId: adminId.toString() },
        body: { accountStatus: 'SUSPENDED', reason: 'Self change' },
      })
    ),
    (error) => error.statusCode === 403
  );

  const completedRide = await Ride.create({
    customer_id: customerId,
    rider_id: riderUserId,
    request_type: 'TRANSPORT',
    pickup_location: {
      address: 'Campus',
      latitude: 8.7581,
      longitude: 80.4982,
    },
    destination: {
      address: 'Town',
      latitude: 8.7514,
      longitude: 80.4971,
    },
    distance_km: 0.75,
    fare_amount: 260,
    status: 'COMPLETED',
    accepted_at: new Date(),
    arrived_at: new Date(),
    started_at: new Date(),
    completed_at: new Date(),
  });
  const cancelledRide = await Ride.create({
    customer_id: new mongoose.Types.ObjectId(),
    rider_id: riderUserId,
    request_type: 'DELIVERY',
    delivery_category: 'PARCEL',
    pickup_location: {
      address: 'Campus',
      latitude: 8.7581,
      longitude: 80.4982,
    },
    destination: {
      address: 'Town',
      latitude: 8.7514,
      longitude: 80.4971,
    },
    distance_km: 0.75,
    fare_amount: 210,
    status: 'CANCELLED',
    accepted_at: new Date(),
    cancelled_at: new Date(),
  });
  const payment = await Payment.create({
    ride_id: completedRide._id,
    amount: 260,
    payment_method: 'CASH',
    payment_status: 'PENDING',
    confirmed_by: null,
    paid_at: null,
  });
  await Cancellation.create({
    ride_id: cancelledRide._id,
    cancelled_by: customerId,
    reason: 'Admin monitoring fixture',
    previous_status: 'ACCEPTED',
    cancellation_mode: 'IMMEDIATE',
    cancelled_at: new Date(),
  });
  await Rating.create({
    ride_id: completedRide._id,
    customer_id: customerId,
    rider_id: riderUserId,
    rating: 5,
    review: 'Excellent service',
  });
  const chatAccessRequest = await ChatAccessRequest.create({
    ride_id: completedRide._id,
    requested_by: customerId,
    rider_id: riderUserId,
    reason: 'Lost item',
    status: 'PENDING',
    reviewed_by: null,
    reviewed_at: null,
    approved_from: null,
    approved_until: null,
  });

  const paymentResult = await invokeController(
    adminController.correctPayment,
    makeRequest({
      user: adminUser,
      params: { paymentId: payment._id.toString() },
      body: {
        amount: 300,
        paymentStatus: 'PAID',
        reason: 'Verified cash dispute receipt',
      },
    })
  );
  assert.equal(paymentResult.body.data.payment.amount, 300);
  assert.equal(paymentResult.body.data.payment.paymentStatus, 'PAID');
  assert.equal(paymentResult.body.data.payment.confirmedBy, null);
  assert.ok(paymentResult.body.data.payment.paidAt);

  const emittedChatUpdates = [];
  const mockIo = {
    rooms: [],
    to(room) {
      this.rooms.push(room);
      return this;
    },
    emit(event, payload) {
      emittedChatUpdates.push({ rooms: [...this.rooms], event, payload });
      this.rooms = [];
    },
  };
  const reviewResult = await invokeController(
    adminController.reviewChatAccessRequest,
    makeRequest({
      user: adminUser,
      params: { requestId: chatAccessRequest._id.toString() },
      body: { decision: 'APPROVE', reason: 'Lost-item contact is justified' },
      app: { get: (key) => (key === 'io' ? mockIo : null) },
    })
  );
  const reviewedRequest = reviewResult.body.data.chatAccessRequest;
  assert.equal(reviewedRequest.status, 'APPROVED');
  assert.equal(reviewedRequest.reviewedBy, adminId.toString());
  assert.equal(
    new Date(reviewedRequest.approvedUntil).getTime() -
      new Date(reviewedRequest.approvedFrom).getTime(),
    24 * 60 * 60 * 1000
  );
  assert.equal(emittedChatUpdates[0].event, 'chat_access_updated');
  assert.equal(emittedChatUpdates[0].payload.status, 'APPROVED');

  const adminRides = await invokeController(
    adminController.getAllRides,
    makeRequest({ user: adminUser })
  );
  const serializedCompletedRide = adminRides.body.data.rides.find(
    (ride) => ride.id === completedRide._id.toString()
  );
  assert.equal(serializedCompletedRide.customer.name, 'Managed Customer');
  assert.equal(serializedCompletedRide.assignedRider.name, 'Managed Rider');
  assert.match(
    serializedCompletedRide.assignedRider.vehicle,
    /^Test Model · TEST-\d+$/
  );

  const listChecks = [
    [adminController.getAllUsers, 'users', 3],
    [adminController.getAllRides, 'rides', 2],
    [adminController.getAllCancellations, 'cancellations', 1],
    [adminController.getAllPayments, 'payments', 1],
    [adminController.getAllRatings, 'ratings', 1],
    [adminController.getChatAccessRequests, 'chatAccessRequests', 1],
  ];
  for (const [controller, responseKey, expectedCount] of listChecks) {
    const result = await invokeController(
      controller,
      makeRequest({ user: adminUser })
    );
    assert.equal(result.body.results, expectedCount);
    assert.equal(result.body.data[responseKey].length, expectedCount);
  }

  const statistics = await invokeController(
    adminController.getAdminStatistics,
    makeRequest({ user: adminUser })
  );
  assert.equal(statistics.body.data.statistics.users.total, 3);
  assert.equal(statistics.body.data.statistics.users.suspended, 1);
  assert.equal(statistics.body.data.statistics.rides.total, 2);
  assert.equal(statistics.body.data.statistics.rides.completed, 1);
  assert.equal(statistics.body.data.statistics.rides.cancelled, 1);
  assert.equal(statistics.body.data.statistics.payments.paid, 1);
  assert.equal(statistics.body.data.statistics.payments.totalPaidAmount, 300);
  assert.equal(statistics.body.data.statistics.cancellations.total, 1);
  assert.equal(statistics.body.data.statistics.ratings.averageRating, 5);
  assert.equal(statistics.body.data.statistics.chatAccessRequests.pending, 0);

  const audits = await AdminAuditLog.find().sort({ created_at: 1 }).lean();
  assert.deepEqual(
    audits.map((item) => item.action).sort(),
    [
      'CHAT_ACCESS_REVIEWED',
      'PAYMENT_CORRECTED',
      'USER_STATUS_CHANGED',
    ]
  );
  assert.ok(audits.every((item) => item.reason.length > 0));
});

test('returns participant-scoped history summaries and paid rider earnings', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const riderUserId = new mongoose.Types.ObjectId();
  const otherCustomerId = new mongoose.Types.ObjectId();
  const otherRiderId = new mongoose.Types.ObjectId();
  await User.create([
    {
      _id: customerId,
      name: 'History Customer',
      email: 'phase12-customer@example.com',
      phone: '0700001201',
      password_hash: 'test-password-hash',
      role: 'CUSTOMER',
      account_status: 'ACTIVE',
      token_version: 0,
    },
    {
      _id: riderUserId,
      name: 'History Rider',
      email: 'phase12-rider@example.com',
      phone: '0700001202',
      password_hash: 'test-password-hash',
      role: 'RIDER',
      account_status: 'ACTIVE',
      token_version: 0,
    },
    {
      _id: otherCustomerId,
      name: 'Other Customer',
      email: 'phase12-other-customer@example.com',
      phone: '0700001203',
      password_hash: 'test-password-hash',
      role: 'CUSTOMER',
      account_status: 'ACTIVE',
      token_version: 0,
    },
    {
      _id: otherRiderId,
      name: 'Other Rider',
      email: 'phase12-other-rider@example.com',
      phone: '0700001204',
      password_hash: 'test-password-hash',
      role: 'RIDER',
      account_status: 'ACTIVE',
      token_version: 0,
    },
  ]);
  await Rider.create(approvedRider(riderUserId));

  const location = {
    pickup_location: {
      address: 'Campus',
      latitude: 8.7581,
      longitude: 80.4982,
    },
    destination: {
      address: 'Town',
      latitude: 8.7514,
      longitude: 80.4971,
    },
    distance_km: 0.75,
  };
  const now = new Date();
  const paidRide = await Ride.create({
    customer_id: customerId,
    rider_id: riderUserId,
    request_type: 'TRANSPORT',
    ...location,
    fare_amount: 260,
    status: 'COMPLETED',
    accepted_at: now,
    arrived_at: now,
    started_at: now,
    completed_at: now,
  });
  const pendingRide = await Ride.create({
    customer_id: customerId,
    rider_id: riderUserId,
    request_type: 'DELIVERY',
    delivery_category: 'PARCEL',
    ...location,
    fare_amount: 280,
    status: 'COMPLETED',
    accepted_at: now,
    arrived_at: now,
    started_at: now,
    completed_at: now,
  });
  const cancelledRide = await Ride.create({
    customer_id: customerId,
    rider_id: riderUserId,
    request_type: 'DELIVERY',
    delivery_category: 'FOOD',
    ...location,
    fare_amount: 210,
    status: 'CANCELLED',
    accepted_at: now,
    cancelled_at: now,
  });
  const unrelatedRide = await Ride.create({
    customer_id: otherCustomerId,
    rider_id: otherRiderId,
    request_type: 'TRANSPORT',
    ...location,
    fare_amount: 900,
    status: 'COMPLETED',
    accepted_at: now,
    arrived_at: now,
    started_at: now,
    completed_at: now,
  });
  await Payment.create([
    {
      ride_id: paidRide._id,
      amount: 300,
      payment_method: 'CASH',
      payment_status: 'PAID',
      confirmed_by: riderUserId,
      paid_at: now,
    },
    {
      ride_id: pendingRide._id,
      amount: 280,
      payment_method: 'CASH',
      payment_status: 'PENDING',
    },
    {
      ride_id: cancelledRide._id,
      amount: 210,
      payment_method: 'CASH',
      payment_status: 'PENDING',
    },
    {
      ride_id: unrelatedRide._id,
      amount: 900,
      payment_method: 'CASH',
      payment_status: 'PAID',
      confirmed_by: otherRiderId,
      paid_at: now,
    },
  ]);
  await Cancellation.create({
    ride_id: cancelledRide._id,
    cancelled_by: customerId,
    reason: 'History fixture cancellation',
    previous_status: 'ACCEPTED',
    cancellation_mode: 'IMMEDIATE',
    cancelled_at: now,
  });
  await Rating.create({
    ride_id: paidRide._id,
    customer_id: customerId,
    rider_id: riderUserId,
    rating: 5,
    review: 'Excellent ride',
  });

  const customerHistory = await invokeController(
    historyController.getMyHistory,
    makeRequest({
      user: { id: customerId.toString(), role: 'CUSTOMER' },
    })
  );
  assert.equal(customerHistory.statusCode, 200);
  assert.equal(customerHistory.body.results, 3);
  assert.deepEqual(customerHistory.body.data.summary.rides, {
    total: 3,
    active: 0,
    completed: 2,
    cancelled: 1,
  });
  assert.deepEqual(customerHistory.body.data.summary.payments, {
    paid: 1,
    pending: 2,
    totalPaidAmount: 300,
  });
  assert.equal(customerHistory.body.data.summary.cancellations.total, 1);
  assert.equal(customerHistory.body.data.summary.ratings.submitted, 1);
  assert.ok(
    customerHistory.body.data.history.every(
      (item) => item.ride.customerId === customerId.toString()
    )
  );

  const riderHistory = await invokeController(
    historyController.getMyHistory,
    makeRequest({
      user: { id: riderUserId.toString(), role: 'RIDER' },
    })
  );
  assert.equal(riderHistory.body.results, 3);
  assert.deepEqual(riderHistory.body.data.summary.ratings, {
    received: 1,
    averageRating: 5,
  });
  assert.ok(
    riderHistory.body.data.history.every(
      (item) => item.ride.riderId === riderUserId.toString()
    )
  );

  const earningsResult = await invokeController(
    historyController.getRiderEarnings,
    makeRequest({
      user: { id: riderUserId.toString(), role: 'RIDER' },
    })
  );
  assert.equal(earningsResult.body.results, 1);
  assert.deepEqual(earningsResult.body.data.summary, {
    currency: 'LKR',
    totalEarnings: 300,
    paidRideCount: 1,
    pendingReceiptAmount: 280,
    pendingReceiptCount: 1,
  });
  assert.equal(earningsResult.body.data.earnings[0].amount, 300);
  assert.equal(
    earningsResult.body.data.earnings[0].rideId,
    paidRide._id.toString()
  );

  await assert.rejects(
    invokeController(
      historyController.getRiderEarnings,
      makeRequest({
        user: { id: customerId.toString(), role: 'CUSTOMER' },
      })
    ),
    (error) => error.statusCode === 403
  );
});

test('keeps the Postman collection synchronized with every implemented API route', () => {
  const collectionPath = path.resolve(
    __dirname,
    '../../documentation/postman/VanniRide-B2.postman_collection.json'
  );
  const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
  const collectedRoutes = [];
  const collectRequests = (items) => {
    for (const item of items || []) {
      if (item.request) {
        const normalizedPath = String(item.request.url)
          .replace('{{baseUrl}}', '')
          .split('?')[0]
          .replaceAll('{{rideId}}', ':rideId')
          .replaceAll('{{riderId}}', ':riderId')
          .replaceAll('{{riderUserId}}', ':riderUserId')
          .replaceAll('{{userId}}', ':userId')
          .replaceAll('{{paymentId}}', ':paymentId')
          .replaceAll('{{chatAccessRequestId}}', ':requestId');
        collectedRoutes.push(`${item.request.method} ${normalizedPath}`);
      }
      collectRequests(item.item);
    }
  };
  collectRequests(collection.item);

  const mountedRouters = [
    ['/api/auth', authRoutes],
    ['/api/users', userRoutes],
    ['/api/rides', rideRoutes],
    ['/api/rides', paymentRoutes],
    ['/api/rides', chatRoutes],
    ['/api', ratingRoutes],
    ['/api/admin', adminRoutes],
    ['/api/maps', mapRoutes],
  ];
  const implementedRoutes = mountedRouters.flatMap(([basePath, router]) =>
    router.stack.flatMap((layer) => {
      if (!layer.route) return [];
      const routePaths = Array.isArray(layer.route.path)
        ? layer.route.path
        : [layer.route.path];
      return routePaths.flatMap((routePath) =>
        Object.entries(layer.route.methods)
          .filter(([, enabled]) => enabled)
          .map(
            ([method]) =>
              `${method.toUpperCase()} ${basePath}${
                routePath === '/' ? '' : routePath
              }`
          )
      );
    })
  );

  assert.equal(new Set(collectedRoutes).size, collectedRoutes.length);
  assert.equal(implementedRoutes.length, 43);
  assert.deepEqual(collectedRoutes.sort(), implementedRoutes.sort());
});

test('enforces bearer authentication, stored roles, account status, and token revocation', async () => {
  assert.ok(env.jwtSecret, 'JWT_SECRET must be configured for security tests');
  const customerId = new mongoose.Types.ObjectId();
  await User.create({
    _id: customerId,
    name: 'Security Customer',
    email: 'phase13-security@example.com',
    phone: '0700001301',
    password_hash: 'test-password-hash',
    role: 'CUSTOMER',
    account_status: 'ACTIVE',
    token_version: 0,
  });
  const customerToken = jwt.sign(
    { id: customerId.toString(), role: 'CUSTOMER', tokenVersion: 0 },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
  const forgedAdminToken = jwt.sign(
    { id: customerId.toString(), role: 'ADMIN', tokenVersion: 0 },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const get = (endpoint, token) =>
    originalFetch(`${baseUrl}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  try {
    assert.equal((await get('/api/users/profile')).status, 401);
    assert.equal(
      (await get('/api/admin/users', forgedAdminToken)).status,
      401
    );
    assert.equal((await get('/api/admin/users', customerToken)).status, 403);
    assert.equal(
      (await get('/api/users/rider/earnings', customerToken)).status,
      403
    );

    await User.updateOne(
      { _id: customerId },
      { $set: { account_status: 'SUSPENDED' } }
    );
    assert.equal((await get('/api/users/profile', customerToken)).status, 403);

    await User.updateOne(
      { _id: customerId },
      { $set: { account_status: 'ACTIVE' }, $inc: { token_version: 1 } }
    );
    assert.equal((await get('/api/users/profile', customerToken)).status, 401);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test('authenticates ride sockets and persists room-scoped messages', async () => {
  const jwtSecret = 'socket-test-secret';
  const customerId = new mongoose.Types.ObjectId();
  const riderUserId = new mongoose.Types.ObjectId();
  const outsiderId = new mongoose.Types.ObjectId();
  await User.create([
    {
      _id: customerId,
      name: 'Socket Customer',
      email: 'socket-customer@example.com',
      phone: '0700000101',
      password_hash: 'test-password-hash',
      role: 'CUSTOMER',
      account_status: 'ACTIVE',
      token_version: 0,
    },
    {
      _id: riderUserId,
      name: 'Socket Rider',
      email: 'socket-rider@example.com',
      phone: '0700000102',
      password_hash: 'test-password-hash',
      role: 'RIDER',
      account_status: 'ACTIVE',
      token_version: 0,
    },
    {
      _id: outsiderId,
      name: 'Outside Rider',
      email: 'outside-rider@example.com',
      phone: '0700000103',
      password_hash: 'test-password-hash',
      role: 'RIDER',
      account_status: 'ACTIVE',
      token_version: 0,
    },
  ]);
  const ride = await Ride.create({
    customer_id: customerId,
    rider_id: riderUserId,
    request_type: 'TRANSPORT',
    pickup_location: {
      address: 'Campus',
      latitude: 8.7581,
      longitude: 80.4982,
    },
    destination: {
      address: 'Town',
      latitude: 8.7514,
      longitude: 80.4971,
    },
    distance_km: 0.75,
    fare_amount: 260,
    status: 'ACCEPTED',
    accepted_at: new Date(),
  });

  const httpServer = http.createServer();
  const ioServer = new SocketServer(httpServer, { cors: { origin: '*' } });
  initializeSocketHandler(ioServer, { jwtSecret });
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address();
  const url = `http://127.0.0.1:${port}`;

  const connect = (id, role) =>
    new Promise((resolve, reject) => {
      const token = jwt.sign(
        { id: id.toString(), role, tokenVersion: 0 },
        jwtSecret
      );
      const socket = createSocketClient(url, {
        auth: { token },
        transports: ['websocket'],
      });
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });

  const emitWithAck = (socket, event, payload) =>
    new Promise((resolve) => socket.emit(event, payload, resolve));

  let customerSocket;
  let riderSocket;
  let outsiderSocket;

  try {
    [customerSocket, riderSocket, outsiderSocket] = await Promise.all([
      connect(customerId, 'CUSTOMER'),
      connect(riderUserId, 'RIDER'),
      connect(outsiderId, 'RIDER'),
    ]);

    const customerJoin = await emitWithAck(customerSocket, 'join_ride', {
      rideId: ride._id.toString(),
    });
    const riderJoin = await emitWithAck(riderSocket, 'join_ride', {
      rideId: ride._id.toString(),
    });
    const outsiderJoin = await emitWithAck(outsiderSocket, 'join_ride', {
      rideId: ride._id.toString(),
    });

    assert.equal(customerJoin.success, true);
    assert.equal(riderJoin.success, true);
    assert.equal(outsiderJoin.success, false);

    const receivedMessage = new Promise((resolve) => {
      riderSocket.once('new_message', resolve);
    });
    const sendResult = await emitWithAck(customerSocket, 'send_message', {
      rideId: ride._id.toString(),
      messageText: 'Socket message',
    });

    assert.equal(sendResult.success, true);
    assert.equal((await receivedMessage).messageText, 'Socket message');
    assert.equal(
      await Message.countDocuments({
        ride_id: ride._id,
        message_text: 'Socket message',
      }),
      1
    );

    await User.updateOne(
      { _id: customerId },
      { $inc: { token_version: 1 } }
    );
    const revokedSend = await emitWithAck(customerSocket, 'send_message', {
      rideId: ride._id.toString(),
      messageText: 'Revoked session message',
    });
    assert.equal(revokedSend.success, false);
    assert.equal(revokedSend.message, 'This session is no longer valid');
    assert.equal(
      await Message.countDocuments({ message_text: 'Revoked session message' }),
      0
    );
  } finally {
    customerSocket?.disconnect();
    riderSocket?.disconnect();
    outsiderSocket?.disconnect();
    await ioServer.close();
    await new Promise((resolve) => httpServer.close(resolve));
  }
});
