const AppError = require('../utils/appError');


exports.validateRegister = (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !phone || !password || !role) {
    return next(new AppError('All fields (name, email, phone, password, role) are required', 400));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Please provide a valid email address', 400));
  }

  if (password.length < 6) {
    return next(new AppError('Password must be at least 6 characters long', 400));
  }

  next();
};