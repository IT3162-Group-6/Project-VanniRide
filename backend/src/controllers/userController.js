const bcrypt = require('bcryptjs');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const Rider = require('../models/riderModel');
const { getUserRoles, serializeUser } = require('./authController');
const {
  hashRecoveryValue,
  validateIdentityNumber,
  validateSecurityAnswer,
  validateSecurityQuestion,
} = require('../services/accountSecurityService');
const {
  getCancellationAllowance,
} = require('../services/cancellationService');
const {
  normalizeVehicle,
  serializeRiderProfile,
} = require('../services/riderService');
const { emitRiderAvailabilityChanged } = require('../utils/socketEvents');

exports.getProfile = async (req, res, next) => {
  try {
    const roles = getUserRoles(req.user);
    const rider =
      roles.includes('RIDER')
        ? await Rider.findOne({ user_id: req.user._id })
        : null;

    if (roles.includes('RIDER') && !rider) {
      return next(new AppError('Rider profile not found', 404));
    }

    return res.status(200).json({
      success: true,
      data: {
        user: serializeUser(req.user),
        riderProfile: serializeRiderProfile(rider),
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateRecoverySettings = async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    let identityNumber;
    let securityQuestion;
    let securityAnswer;
    try {
      identityNumber = validateIdentityNumber(req.body.identityNumber);
      securityQuestion = validateSecurityQuestion(req.body.securityQuestion);
      securityAnswer = validateSecurityAnswer(req.body.securityAnswer);
    } catch (validationError) {
      return next(new AppError(validationError.message, 400));
    }

    const user = await User.findById(req.user._id).select('+password_hash');
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      return next(new AppError('Current password is incorrect', 400));
    }
    const [identityNumberHash, securityAnswerHash] = await Promise.all([
      hashRecoveryValue(identityNumber),
      hashRecoveryValue(securityAnswer),
    ]);
    user.identity_number_hash = identityNumberHash;
    user.security_question = securityQuestion;
    user.security_answer_hash = securityAnswerHash;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Recovery details updated successfully',
      data: { user: serializeUser(user, req.user.role) },
    });
  } catch (error) {
    return next(error);
  }
};

exports.getRiderAvailabilitySummary = async (req, res, next) => {
  try {
    const rows = await Rider.aggregate([
      { $match: { approval_status: 'APPROVED' } },
      { $group: { _id: '$availability_status', count: { $sum: 1 } } },
    ]);
    const byStatus = Object.fromEntries(rows.map((row) => [row._id, row.count]));

    return res.status(200).json({
      success: true,
      data: {
        riderAvailability: {
          available: byStatus.AVAILABLE || 0,
          busy: byStatus.BUSY || 0,
          offline: byStatus.UNAVAILABLE || 0,
          approved: rows.reduce((total, row) => total + row.count, 0),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.addAccountRole = async (req, res, next) => {
  let createdRider = null;
  try {
    const role = String(req.body.role || '').toUpperCase();
    if (!['CUSTOMER', 'RIDER'].includes(role)) {
      return next(new AppError('Role must be CUSTOMER or RIDER', 400));
    }
    const user = await User.findById(req.user._id);
    const roles = getUserRoles(user);
    if (roles.includes(role)) {
      return next(new AppError('This role is already enabled for your account', 409));
    }

    if (role === 'RIDER') {
      createdRider = await Rider.create({
        user_id: user._id,
        availability_status: 'UNAVAILABLE',
        vehicle: normalizeVehicle(req.body.vehicle),
        approval_status: 'PENDING',
        review_reason: null,
        reviewed_by: null,
        reviewed_at: null,
      });
    }
    user.roles = [...roles, role];
    await user.save();

    return res.status(201).json({
      success: true,
      message: role === 'RIDER'
        ? 'Rider access submitted for administrator approval'
        : 'Customer access enabled',
      data: {
        user: serializeUser(user, req.user.role),
        riderProfile: serializeRiderProfile(createdRider),
      },
    });
  } catch (error) {
    if (createdRider?._id) await Rider.deleteOne({ _id: createdRider._id });
    if (error?.code === 11000 && error?.keyPattern?.['vehicle.registration_number']) {
      return next(new AppError('Vehicle registration number is already registered', 409));
    }
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
      data: { user: serializeUser(user, req.user.role) },
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
        approval_status: 'APPROVED',
      },
      { $set: { availability_status: availabilityStatus } },
      { returnDocument: 'after', runValidators: true }
    );

    if (!rider) {
      const riderExists = await Rider.exists({ user_id: req.user._id });
      if (!riderExists) {
        return next(new AppError('Rider profile not found', 404));
      }

      const currentRider = await Rider.findOne({ user_id: req.user._id })
        .select('availability_status approval_status')
        .lean();
      if (currentRider.approval_status !== 'APPROVED') {
        return next(
          new AppError(
            `Rider approval is ${currentRider.approval_status.toLowerCase()}`,
            403
          )
        );
      }
      return next(
        new AppError('A busy rider cannot manually change availability', 409)
      );
    }

    emitRiderAvailabilityChanged(req, rider);

    return res.status(200).json({
      success: true,
      message: `Rider availability updated to ${availabilityStatus}`,
      data: { riderProfile: serializeRiderProfile(rider) },
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateRiderProfile = async (req, res, next) => {
  try {
    const vehicle = normalizeVehicle(req.body.vehicle);
    const rider = await Rider.findOne({ user_id: req.user._id });
    if (!rider) {
      return next(new AppError('Rider profile not found', 404));
    }
    if (rider.availability_status === 'BUSY') {
      return next(
        new AppError('A busy rider cannot change vehicle information', 409)
      );
    }

    const currentVehicle = rider.vehicle?.toObject
      ? rider.vehicle.toObject()
      : rider.vehicle;
    const changed =
      !currentVehicle ||
      currentVehicle.type !== vehicle.type ||
      currentVehicle.model !== vehicle.model ||
      currentVehicle.registration_number !== vehicle.registration_number ||
      currentVehicle.color !== vehicle.color;
    if (!changed) {
      return next(new AppError('Vehicle information has not changed', 409));
    }

    const reapprovalTriggered = rider.approval_status === 'APPROVED';
    rider.vehicle = vehicle;
    rider.approval_status = 'PENDING';
    rider.availability_status = 'UNAVAILABLE';
    rider.review_reason = null;
    rider.reviewed_by = null;
    rider.reviewed_at = null;
    await rider.save();

    return res.status(200).json({
      success: true,
      message: reapprovalTriggered
        ? 'Vehicle updated and submitted for reapproval'
        : 'Vehicle information submitted for approval',
      data: {
        riderProfile: serializeRiderProfile(rider),
        reapprovalTriggered,
      },
    });
  } catch (error) {
    if (
      error?.code === 11000 &&
      error?.keyPattern?.['vehicle.registration_number']
    ) {
      return next(
        new AppError('Vehicle registration number is already registered', 409)
      );
    }
    return next(error);
  }
};

exports.getCancellationAllowance = async (req, res, next) => {
  try {
    const allowance = await getCancellationAllowance(req.user._id);
    return res.status(200).json({
      success: true,
      data: { cancellationAllowance: allowance },
    });
  } catch (error) {
    return next(error);
  }
};
