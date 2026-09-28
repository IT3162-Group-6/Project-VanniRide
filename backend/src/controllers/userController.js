const AppError = require('../utils/appError');
const User = require('../models/userModel');
const Rider = require('../models/riderModel');
const { serializeUser } = require('./authController');

const serializeRider = (riderDocument) => {
  if (!riderDocument) return null;
  const rider = riderDocument.toObject
    ? riderDocument.toObject()
    : riderDocument;

  return {
    id: rider._id.toString(),
    userId: rider.user_id.toString(),
    availabilityStatus: rider.availability_status,
    createdAt: rider.created_at,
    updatedAt: rider.updated_at,
  };
};

exports.getProfile = async (req, res, next) => {
  try {
    const rider =
      req.user.role === 'RIDER'
        ? await Rider.findOne({ user_id: req.user._id })
        : null;

    if (req.user.role === 'RIDER' && !rider) {
      return next(new AppError('Rider profile not found', 404));
    }

    return res.status(200).json({
      success: true,
      data: {
        user: serializeUser(req.user),
        rider: serializeRider(rider),
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return next(new AppError('Name cannot be empty', 400));
      updates.name = name;
    }

    if (req.body.phone !== undefined) {
      const phone = String(req.body.phone).trim();
      if (!phone) return next(new AppError('Phone cannot be empty', 400));
      updates.phone = phone;
    }

    if (Object.keys(updates).length === 0) {
      return next(new AppError('Provide name or phone to update', 400));
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: serializeUser(user) },
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateRiderAvailability = async (req, res, next) => {
  try {
    const availabilityStatus = String(
      req.body.availabilityStatus || ''
    ).toUpperCase();

    if (!['AVAILABLE', 'UNAVAILABLE'].includes(availabilityStatus)) {
      return next(
        new AppError('Availability must be AVAILABLE or UNAVAILABLE', 400)
      );
    }

    const rider = await Rider.findOneAndUpdate(
      {
        user_id: req.user._id,
        availability_status: { $ne: 'BUSY' },
      },
      { $set: { availability_status: availabilityStatus } },
      { returnDocument: 'after', runValidators: true }
    );

    if (!rider) {
      const riderExists = await Rider.exists({ user_id: req.user._id });
      if (!riderExists) {
        return next(new AppError('Rider profile not found', 404));
      }

      return next(
        new AppError('A busy rider cannot manually change availability', 409)
      );
    }

    return res.status(200).json({
      success: true,
      message: `Rider availability updated to ${availabilityStatus}`,
      data: { rider: serializeRider(rider) },
    });
  } catch (error) {
    return next(error);
  }
};
