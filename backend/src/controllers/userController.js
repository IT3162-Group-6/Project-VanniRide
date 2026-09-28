const AppError = require('../utils/appError');
const users = require('../models/userModel');

exports.getProfile = async (req, res, next) => {
  try {
    const user = users.find((u) => u.id === req.user.id);

    if (!user) {
      return next(new AppError('User profile not found', 404));
    }

    const { password, ...userProfile } = user;

    res.status(200).json({
      success: true,
      data: { user: userProfile },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const userIndex = users.findIndex((u) => u.id === req.user.id);

    if (userIndex === -1) {
      return next(new AppError('User not found', 404));
    }

    if (name) users[userIndex].name = name;
    if (phone) users[userIndex].phone = phone;

    const updatedUser = { ...users[userIndex] };
    delete updatedUser.password;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateRiderAvailability = async (req, res, next) => {
  try {
    const { availabilityStatus } = req.body;

    if (req.user.role !== 'RIDER') {
      return next(
        new AppError('Only riders can update availability status', 403)
      );
    }

    const validStatuses = ['AVAILABLE', 'UNAVAILABLE', 'BUSY'];
    if (!validStatuses.includes(availabilityStatus)) {
      return next(
        new AppError(
          'Invalid status. Allowed values: AVAILABLE, UNAVAILABLE, BUSY',
          400
        )
      );
    }

    const userIndex = users.findIndex((u) => u.id === req.user.id);
    users[userIndex].availabilityStatus = availabilityStatus;

    res.status(200).json({
      success: true,
      message: `Rider status updated to ${availabilityStatus}`,
      data: {
        userId: req.user.id,
        availabilityStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};