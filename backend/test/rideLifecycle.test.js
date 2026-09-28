const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server: SocketServer } = require('socket.io');
const { io: createSocketClient } = require('socket.io-client');
const rideController = require('../src/controllers/rideController');
const paymentController = require('../src/controllers/paymentController');
const chatController = require('../src/controllers/chatController');
const Ride = require('../src/models/rideModel');
const Rider = require('../src/models/riderModel');
const Cancellation = require('../src/models/cancellationModel');
const Payment = require('../src/models/paymentModel');
const Message = require('../src/models/messageModel');
const initializeSocketHandler = require('../src/sockets/socketHandler');
const {
  calculateDistanceKm,
  calculateFare,
} = require('../src/utils/fareCalculator');

const TEST_DATABASE_URI =
  process.env.MONGODB_TEST_URI ||
  'mongodb://127.0.0.1:27017/vanniRideDB_test';

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

const makeRequest = ({ user, body = {}, params = {} }) => ({
  user,
  body,
  params,
});

test.before(async () => {
  await mongoose.connect(TEST_DATABASE_URI, { serverSelectionTimeoutMS: 5000 });
});

test.beforeEach(async () => {
  await Promise.all([
    Ride.deleteMany({}),
    Rider.deleteMany({}),
    Cancellation.deleteMany({}),
    Payment.deleteMany({}),
    Message.deleteMany({}),
  ]);
});

test.after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('calculates distance and estimated fare from coordinates', () => {
  const distanceKm = calculateDistanceKm(
    { latitude: 8.7581, longitude: 80.4982 },
    { latitude: 8.7514, longitude: 80.4971 }
  );

  assert.equal(distanceKm, 0.75);
  assert.equal(calculateFare('TRANSPORT', distanceKm), 260);
  assert.equal(calculateFare('DELIVERY', distanceKm), 210);
});

test('completes the ordered ride lifecycle and releases the rider', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const riderUserId = new mongoose.Types.ObjectId();
  const competingRiderUserId = new mongoose.Types.ObjectId();

  await Rider.create([
    { user_id: riderUserId, availability_status: 'AVAILABLE' },
    { user_id: competingRiderUserId, availability_status: 'AVAILABLE' },
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

  const messageResult = await invokeController(
    chatController.sendMessage,
    makeRequest({
      user: { id: customerId.toString(), role: 'CUSTOMER' },
      params: { rideId },
      body: { messageText: 'I am waiting near the main gate.' },
    })
  );
  assert.equal(messageResult.statusCode, 201);
  assert.equal(
    messageResult.body.data.message.messageText,
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

test('authenticates ride sockets and persists room-scoped messages', async () => {
  const jwtSecret = 'socket-test-secret';
  const customerId = new mongoose.Types.ObjectId();
  const riderUserId = new mongoose.Types.ObjectId();
  const outsiderId = new mongoose.Types.ObjectId();
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
      const token = jwt.sign({ id: id.toString(), role }, jwtSecret);
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
  } finally {
    customerSocket?.disconnect();
    riderSocket?.disconnect();
    outsiderSocket?.disconnect();
    await ioServer.close();
    await new Promise((resolve) => httpServer.close(resolve));
  }
});
