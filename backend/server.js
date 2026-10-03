const http = require('http');
const mongoose = require('mongoose');
const { Server: SocketServer } = require('socket.io');
const app = require('./src/app');
const config = require('./src/config/env');
const connectDatabase = require('./src/config/database');
const initializeSocketHandler = require('./src/sockets/socketHandler');
const {
  startCancellationWorker,
} = require('./src/workers/cancellationWorker');

// Catch uncaught exceptions (Synchronous code crashes)
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

let server;
let io;
let stopCancellationWorker;
let shuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down safely.`);
  stopCancellationWorker?.();
  io?.disconnectSockets(true);
  if (server?.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  process.exit(exitCode);
};

const startServer = async () => {
  config.validateRuntimeConfig();
  await connectDatabase(config.mongoUri);

  server = http.createServer(app);
  io = new SocketServer(server, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
    },
  });
  app.set('io', io);
  initializeSocketHandler(io, config);
  stopCancellationWorker = startCancellationWorker(
    io,
    config.cancellationSweepIntervalMs
  );

  server.listen(config.port, () => {
    console.log(
      `🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`
    );
  });
};

startServer().catch((err) => {
  console.error('SERVER STARTUP FAILED! 💥');
  console.error(err.message);
  process.exit(1);
});

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

// Catch unhandled rejections (Asynchronous / Promise errors)
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  void shutdown('unhandled rejection', 1);
});
