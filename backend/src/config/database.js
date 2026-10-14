const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const connectDatabase = async (mongoUri) => {
  if (!mongoUri) {
    throw new AppError(
      'MONGODB_URI is required. Add it to the backend .env file.',
      500
    );
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log(`MongoDB connected: ${mongoose.connection.name}`);
};

module.exports = connectDatabase;
