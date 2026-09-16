const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/appError');
const users = require('../models/userModel');


exports.protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

   
    const decoded = jwt.verify(token, env.jwtSecret);

    
    const currentUser = users.find((u) => u.id === decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    
    req.user = currentUser;
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired token!', 401));
  }
};


exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};