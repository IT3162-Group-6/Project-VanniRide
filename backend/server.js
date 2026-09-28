const http = require('http');
const { Server: SocketServer } = require('socket.io');
const app = require('./src/app');
const config = require('./src/config/env');
const connectDatabase = require('./src/config/database');
const initializeSocketHandler = require('./src/sockets/socketHandler');

// Catch uncaught exceptions (Synchronous code crashes)
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

let server;

const startServer = async () => {
  await connectDatabase(config.mongoUri);

  server = http.createServer(app);
  const io = new SocketServer(server, {
    cors: { origin: '*' },
  });
  app.set('io', io);
  initializeSocketHandler(io, config);

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

// Catch unhandled rejections (Asynchronous / Promise errors)
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
