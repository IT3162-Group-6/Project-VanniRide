const app = require('./src/app');
const config = require('./src/config/env');

// Uncaught Exceptions Catch කිරීම (Code crashes වැළැක්වීමට)
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
});

// Unhandled Rejections Catch කිරීම
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});