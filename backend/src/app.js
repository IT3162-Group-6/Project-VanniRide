const express = require('express');
const cors = require('cors');
const AppError = require('./utils/appError');
const errorHandler = require('./middlewares/errorMiddleware');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Base Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Vanni Ride API!',
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// Handle 404 Routes
app.all('/{0,}', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;