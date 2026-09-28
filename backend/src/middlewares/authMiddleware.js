const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const env = require('../config/env');
const AppError = require('../utils/appError');
const User = require('../models/userModel');

const getBearerToken = (authorization) => {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
};

exports.protect = async (req, res, next) => {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return next(
        new AppError('You are not logged in. Please provide a bearer token.', 401)
      );
    }

    if (!env.jwtSecret) {
      return next(new AppError('JWT_SECRET is not configured', 500));
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    if (!mongoose.isValidObjectId(decoded.id)) {
      return next(new AppError('Invalid authentication token', 401));
    }

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError('The user belonging to this token no longer exists', 401)
      );
    }

    if (currentUser.account_status !== 'ACTIVE') {
      return next(new AppError('This account is suspended', 403));
    }

    if (
      !Number.isInteger(decoded.tokenVersion) ||
      decoded.tokenVersion !== currentUser.token_version
    ) {
      return next(new AppError('This session is no longer valid', 401));
    }

    if (decoded.role !== currentUser.role) {
      return next(new AppError('Invalid authentication token', 401));
    }

    req.user = currentUser;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired authentication token', 401));
    }

    return next(error);
  }
};

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(
      new AppError('You do not have permission to perform this action', 403)
    );
  }

  return next();
};
