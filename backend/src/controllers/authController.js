const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const Rider = require('../models/riderModel');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const serializeUser = (userDocument) => {
  const user = userDocument.toObject ? userDocument.toObject() : userDocument;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    accountStatus: user.account_status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
};

const signToken = (user) => {
  if (!env.jwtSecret) {
    throw new AppError('JWT_SECRET is not configured', 500);
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      tokenVersion: user.token_version,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

exports.register = async (req, res, next) => {
  let createdUser;

  try {
    const { name, phone, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const role = String(req.body.role || '').toUpperCase();

    const existingUser = await User.exists({ email });
    if (existingUser) {
      return next(new AppError('Email already registered', 409));
    }

    if (!['CUSTOMER', 'RIDER'].includes(role)) {
      return next(new AppError('Role must be CUSTOMER or RIDER', 400));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    createdUser = await User.create({
      name: String(name).trim(),
      email,
      phone: String(phone).trim(),
      password_hash: passwordHash,
      role,
      account_status: 'ACTIVE',
      token_version: 0,
    });

    if (role === 'RIDER') {
      await Rider.create({
        user_id: createdUser._id,
        availability_status: 'UNAVAILABLE',
      });
    }

    const token = signToken(createdUser);

    return res.status(201).json({
      success: true,
      token,
      data: { user: serializeUser(createdUser) },
    });
  } catch (error) {
    if (createdUser?._id) {
      await Promise.allSettled([
        Rider.deleteOne({ user_id: createdUser._id }),
        User.deleteOne({ _id: createdUser._id }),
      ]);
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

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      token,
      data: { user: serializeUser(user) },
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

exports.serializeUser = serializeUser;
