const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createCancellationReconciliationMiddleware,
} = require('../src/workers/cancellationWorker');

const invokeMiddleware = (middleware, io = {}) =>
  new Promise((resolve, reject) => {
    const req = { app: { get: () => io } };
    Promise.resolve(middleware(req, {}, resolve)).catch(reject);
  });

test('reconciles before the first API request and throttles later requests', async () => {
  let currentTime = 1000;
  let sweepCount = 0;
  const io = { name: 'test-io' };
  const middleware = createCancellationReconciliationMiddleware({
    minimumIntervalMs: 5000,
    now: () => currentTime,
    sweep: async (receivedIo) => {
      assert.equal(receivedIo, io);
      sweepCount += 1;
    },
  });

  await invokeMiddleware(middleware, io);
  await invokeMiddleware(middleware, io);
  assert.equal(sweepCount, 1);

  currentTime += 5000;
  await invokeMiddleware(middleware, io);
  assert.equal(sweepCount, 2);
});

test('shares one reconciliation between simultaneous API requests', async () => {
  let releaseSweep;
  let sweepCount = 0;
  const sweepBlocked = new Promise((resolve) => {
    releaseSweep = resolve;
  });
  const middleware = createCancellationReconciliationMiddleware({
    minimumIntervalMs: 5000,
    sweep: async () => {
      sweepCount += 1;
      await sweepBlocked;
    },
  });

  const firstRequest = invokeMiddleware(middleware);
  const secondRequest = invokeMiddleware(middleware);
  await Promise.resolve();
  assert.equal(sweepCount, 1);

  releaseSweep();
  await Promise.all([firstRequest, secondRequest]);
  assert.equal(sweepCount, 1);
});

test('allows the API request and retries after a failed reconciliation', async () => {
  let sweepCount = 0;
  const errors = [];
  const middleware = createCancellationReconciliationMiddleware({
    sweep: async () => {
      sweepCount += 1;
      if (sweepCount === 1) throw new Error('temporary database error');
    },
    onError: (error) => errors.push(error.message),
  });

  await invokeMiddleware(middleware);
  await invokeMiddleware(middleware);

  assert.equal(sweepCount, 2);
  assert.deepEqual(errors, ['temporary database error']);
});
