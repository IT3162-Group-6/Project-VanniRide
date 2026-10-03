const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config/env');
const AppError = require('./utils/appError');
const errorHandler = require('./middlewares/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes'); // Member B2 routes
const paymentRoutes = require('./routes/paymentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const mapRoutes = require('./routes/mapRoutes');

const app = express();

// Middlewares
const corsOptions = {
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
      return;
    }
    callback(new AppError('This browser origin is not allowed', 403));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
};
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Base Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Vanni Ride API!',
  });
});

// Health Check Route
app.get('/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    message: databaseReady ? 'Server is ready' : 'Server is not ready',
    data: { database: databaseReady ? 'connected' : 'disconnected' },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/rides', rideRoutes); // Member B2 ride lifecycle
app.use('/api/rides', paymentRoutes); // Member B2 cash payment tracking
app.use('/api/rides', chatRoutes); // Member B2 ride-scoped text chat
app.use('/api', ratingRoutes);
app.use('/api/admin', adminRoutes);

// Handle 404 Routes (Must remain below active routes)
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
module.exports.corsOptions = corsOptions;
