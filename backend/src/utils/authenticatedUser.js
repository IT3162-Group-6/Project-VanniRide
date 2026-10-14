const mongoose = require('mongoose');
const AppError = require('./appError');

const getAuthenticatedUser = (req, allowedRoles) => {
  if (!req.user) {
    throw new AppError('Authentication is required to access this resource', 401);
  }

  if (allowedRoles && !allowedRoles.includes(req.user.role)) {
    throw new AppError('You do not have permission to perform this action', 403);
  }

  const userId = req.user._id || req.user.id;
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError(
      'The authenticated user is not connected to a MongoDB account',
      401
    );
  }

  return {
    userId: new mongoose.Types.ObjectId(userId),
    role: req.user.role,
  };
};

const validateObjectId = (value, label) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(`Invalid ${label}`, 400);
  }
};

module.exports = { getAuthenticatedUser, validateObjectId };
