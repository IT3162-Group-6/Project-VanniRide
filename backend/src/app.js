const express = require('express');
const cors = require('cors');
const AppError = require('./utils/appError');
const errorHandler = require('./middlewares/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes'); // Member B2 routes
const paymentRoutes = require('./routes/paymentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Vanni Ride API!',
  });
});

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is up and running!',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
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
