const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/appError');
const users = require('../models/userModel');


const signToken = (id, role) => {
  return jwt.sign({ id, role }, env.jwtSecret, {
    expiresIn: '7d',
  });
};


exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    
    const existingUser = users.find((u) => u.email === email);
    if (existingUser) {
      return next(new AppError('Email already registered', 400));
    }

    
    if (!['CUSTOMER', 'RIDER'].includes(role)) {
      return next(new AppError('Invalid user role specified', 400));
    }

   
    const hashedPassword = await bcrypt.hash(password, 12);

    
    const newUser = {
      id: users.length + 1,
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      accountStatus: 'ACTIVE',
      createdAt: new Date(),
    };

    users.push(newUser);

    
    const token = signToken(newUser.id, newUser.role);

   
    delete newUser.password;

    res.status(201).json({
      success: true,
      token,
      data: { user: newUser },
    });
  } catch (err) {
    next(err);
  }
};


exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

   
    const user = users.find((u) => u.email === email);
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return next(new AppError('Invalid email or password', 401));
    }


    const token = signToken(user.id, user.role);

    res.status(200).json({
      success: true,
      token,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};