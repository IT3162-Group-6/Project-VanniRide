const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const Rider = require('../models/riderModel');
const PasswordResetToken = require('../models/passwordResetTokenModel');
const PasswordResetRequest = require('../models/passwordResetRequestModel');
const {
  normalizeVehicle,
  serializeRiderProfile,
} = require('../services/riderService');
const {
  isValidEmail,
  registrationEmailIsAllowed,
} = require('../utils/universityEmail');
const {
  SECURITY_QUESTIONS,
  hashRecoveryValue,
  normalizeIdentityNumber,
  normalizeSecurityAnswer,
  recoveryValueMatches,
  validateIdentityNumber,
  validateSecurityAnswer,
  validateSecurityQuestion,
} = require('../services/accountSecurityService');
const {
  hashResetToken,
  isResetTokenFormatValid,
  validateNewPassword,
} = require('../services/passwordResetService');
const { notifyManySafely } = require('../services/notificationService');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const PASSWORD_RESET_RESPONSE =
  'If an active account and all recovery details match, the request will be sent for administrator review.';
const PASSWORD_RESET_DELIVERY = env.passwordResetEmailConfigured ? 'EMAIL' : 'MANUAL';

const getUserRoles = (user) => {
  const roles = Array.isArray(user?.roles) && user.roles.length
    ? user.roles
    : [user?.role];
  return [...new Set(roles.filter(Boolean).map((role) => String(role).toUpperCase()))];
};

const normalizeRegistrationRoles = (body) => {
  const requested = Array.isArray(body.roles) && body.roles.length
    ? body.roles
    : [body.role];
  const roles = [...new Set(requested.filter(Boolean).map((role) => String(role).toUpperCase()))];
  if (!roles.length || roles.some((role) => !['CUSTOMER', 'RIDER'].includes(role))) {
    throw new AppError('Choose Customer, Rider, or Both', 400);
  }
  return roles;
};

const serializeUser = (userDocument, activeRole = null) => {
  const user = userDocument.toObject ? userDocument.toObject() : userDocument;
  const roles = getUserRoles(user);
  const role = String(activeRole || user.role || '').toUpperCase();

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role,
    roles,
    recoveryConfigured: Boolean(user.security_question),
    accountStatus: user.account_status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
};

const signToken = (user, activeRole = user.role) => {
  if (!env.jwtSecret) {
    throw new AppError('JWT_SECRET is not configured', 500);
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      role: activeRole,
      tokenVersion: user.token_version,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

exports.register = async (req, res, next) => {
  let createdUser;
  let createdRider = null;

  try {
    const { name, phone, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const roles = normalizeRegistrationRoles(req.body);
    const role = roles.includes('CUSTOMER') ? 'CUSTOMER' : 'RIDER';

    if (!isValidEmail(email)) {
      return next(new AppError('Please provide a valid email address', 400));
    }
    if (!registrationEmailIsAllowed(email, env)) {
      return next(
        new AppError(
          `Registration requires a @${env.universityEmailDomain} email address`,
          400
        )
      );
    }

    const existingUser = await User.exists({ email });
    if (existingUser) {
      return next(new AppError('Email already registered', 409));
    }

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

    const [passwordHash, identityNumberHash, securityAnswerHash] = await Promise.all([
      bcrypt.hash(password, 12),
      hashRecoveryValue(identityNumber),
      hashRecoveryValue(securityAnswer),
    ]);
    createdUser = await User.create({
      name: String(name).trim(),
      email,
      phone: String(phone).trim(),
      password_hash: passwordHash,
      role,
      roles,
      identity_number_hash: identityNumberHash,
      security_question: securityQuestion,
      security_answer_hash: securityAnswerHash,
      account_status: 'ACTIVE',
      token_version: 0,
    });

    if (roles.includes('RIDER')) {
      createdRider = await Rider.create({
        user_id: createdUser._id,
        availability_status: 'UNAVAILABLE',
        vehicle: normalizeVehicle(req.body.vehicle),
        approval_status: 'PENDING',
        review_reason: null,
        reviewed_by: null,
        reviewed_at: null,
      });
    }

    const token = signToken(createdUser, role);

    return res.status(201).json({
      success: true,
      token,
      data: {
        user: serializeUser(createdUser, role),
        riderProfile: serializeRiderProfile(createdRider),
      },
    });
  } catch (error) {
    if (createdUser?._id) {
      await Promise.allSettled([
        Rider.deleteOne({ user_id: createdUser._id }),
        User.deleteOne({ _id: createdUser._id }),
      ]);
    }

    if (error?.code === 11000 && error?.keyPattern?.['vehicle.registration_number']) {
      return next(new AppError('Vehicle registration number is already registered', 409));
    }

    if (error?.code === 11000) {
      return next(new AppError('Email already registered', 409));
    }

    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    const user = await User.findOne({ email }).select('+password_hash');
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    const passwordIsCorrect = await bcrypt.compare(
      password,
      user.password_hash
    );
    if (!passwordIsCorrect) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (user.account_status !== 'ACTIVE') {
      return next(new AppError('This account is suspended', 403));
    }

    const roles = getUserRoles(user);
    const requestedRole = String(req.body.role || '').toUpperCase();
    const activeRole = requestedRole && roles.includes(requestedRole)
      ? requestedRole
      : (roles.includes(user.role) ? user.role : roles[0]);
    const token = signToken(user, activeRole);
    const riderProfile =
      roles.includes('RIDER')
        ? await Rider.findOne({ user_id: user._id })
        : null;

    return res.status(200).json({
      success: true,
      token,
      data: {
        user: serializeUser(user, activeRole),
        riderProfile: serializeRiderProfile(riderProfile),
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $inc: { token_version: 1 } }
    );

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return next(new AppError('Please provide an email address', 400));
    }

    if (isValidEmail(email)) {
      const user = await User.findOne({
        email,
        account_status: 'ACTIVE',
      }).select('_id security_question +identity_number_hash +security_answer_hash');

      const identityNumber = normalizeIdentityNumber(req.body.identityNumber);
      const securityQuestion = String(req.body.securityQuestion || '').trim();
      const securityAnswer = normalizeSecurityAnswer(req.body.securityAnswer);
      const [identityValueMatches, answerValueMatches] = await Promise.all([
        recoveryValueMatches(identityNumber, user?.identity_number_hash),
        recoveryValueMatches(securityAnswer, user?.security_answer_hash),
      ]);
      const identityMatches = Boolean(user) && identityValueMatches;
      const answerMatches = Boolean(user) &&
        securityQuestion === user.security_question && answerValueMatches;

      if (user && identityMatches && answerMatches) {
        await PasswordResetRequest.findOneAndUpdate(
          { user_id: user._id },
          {
            $set: {
              status: 'PENDING',
              requested_at: new Date(),
              resolved_at: null,
              resolved_by: null,
              identity_number: identityNumber,
              security_question: securityQuestion,
            },
          },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
        const administrators = await User.find({
          _id: { $ne: user._id },
          $or: [{ role: 'ADMIN' }, { roles: 'ADMIN' }],
          account_status: 'ACTIVE',
        }).select('_id');
        await notifyManySafely({
          userIds: administrators.map((administrator) => administrator._id),
          type: 'SYSTEM',
          title: 'Password reset request',
          message: `${email} submitted matching recovery details for administrator review.`,
          link: '/admin/users',
          io: req.app?.get('io'),
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: PASSWORD_RESET_RESPONSE,
      data: { deliveryMethod: PASSWORD_RESET_DELIVERY },
    });
  } catch (error) {
    return next(error);
  }
};

exports.getSecurityQuestions = (req, res) => res.status(200).json({
  success: true,
  data: {
    securityQuestions: SECURITY_QUESTIONS,
    passwordResetDelivery: PASSWORD_RESET_DELIVERY,
  },
});

exports.switchRole = async (req, res, next) => {
  try {
    const role = String(req.body.role || '').toUpperCase();
    const roles = getUserRoles(req.user);
    if (!['CUSTOMER', 'RIDER'].includes(role) || !roles.includes(role)) {
      return next(new AppError('This role is not enabled for your account', 403));
    }
    const riderProfile = roles.includes('RIDER')
      ? await Rider.findOne({ user_id: req.user._id })
      : null;
    if (role === 'RIDER' && !riderProfile) {
      return next(new AppError('Rider profile not found', 409));
    }
    return res.status(200).json({
      success: true,
      token: signToken(req.user, role),
      data: {
        user: serializeUser(req.user, role),
        riderProfile: serializeRiderProfile(riderProfile),
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    let newPassword;
    try {
      newPassword = validateNewPassword(req.body.newPassword);
    } catch (validationError) {
      return next(new AppError(validationError.message, 400));
    }
    const user = await User.findById(req.user._id).select('+password_hash');
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      return next(new AppError('Current password is incorrect', 400));
    }
    if (await bcrypt.compare(newPassword, user.password_hash)) {
      return next(new AppError('New password must be different from the current password', 400));
    }
    user.password_hash = await bcrypt.hash(newPassword, 12);
    user.token_version += 1;
    await user.save();
    await PasswordResetToken.updateMany(
      { user_id: user._id, used_at: null },
      { $set: { used_at: new Date() } }
    );
    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please sign in again.',
    });
  } catch (error) {
    return next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const token = String(req.body.token || '');
    if (!isResetTokenFormatValid(token)) {
      return next(new AppError('Password reset link is invalid or expired', 400));
    }

    let password;
    try {
      password = validateNewPassword(req.body.password);
    } catch (validationError) {
      return next(new AppError(validationError.message, 400));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();
    const resetRecord = await PasswordResetToken.findOneAndUpdate(
      {
        token_hash: hashResetToken(token),
        used_at: null,
        expires_at: { $gt: now },
      },
      { $set: { used_at: now } },
      { returnDocument: 'after' }
    );
    if (!resetRecord) {
      return next(new AppError('Password reset link is invalid or expired', 400));
    }

    const result = await User.updateOne(
      { _id: resetRecord.user_id, account_status: 'ACTIVE' },
      {
        $set: { password_hash: passwordHash },
        $inc: { token_version: 1 },
      }
    );
    if (result.matchedCount !== 1) {
      return next(new AppError('Password reset link is invalid or expired', 400));
    }

    await PasswordResetToken.updateMany(
      { user_id: resetRecord.user_id, used_at: null },
      { $set: { used_at: now } }
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
    });
  } catch (error) {
    return next(error);
  }
};

exports.serializeUser = serializeUser;
exports.getUserRoles = getUserRoles;
