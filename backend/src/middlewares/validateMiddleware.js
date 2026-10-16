const AppError = require('../utils/appError');


exports.validateRegister = (req, res, next) => {
  const { name, email, phone, password, role, roles, identityNumber, securityQuestion, securityAnswer } = req.body;

  if (!name || !email || !phone || !password || (!role && !roles) || !identityNumber || !securityQuestion || !securityAnswer) {
    return next(new AppError('Name, email, phone, password, account type, national ID number, security question, and security answer are required', 400));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Please provide a valid email address', 400));
  }

  if (typeof password !== 'string' || password.length < 6) {
    return next(new AppError('Password must be at least 6 characters long', 400));
  }

  const requestedRoles = Array.isArray(roles) && roles.length ? roles : [role];
  const normalizedRoles = [...new Set(requestedRoles.map((value) => String(value).toUpperCase()))];
  if (!normalizedRoles.length || normalizedRoles.some((value) => !['CUSTOMER', 'RIDER'].includes(value))) {
    return next(new AppError('Choose Customer, Rider, or Both', 400));
  }

  if (
    normalizedRoles.includes('RIDER') &&
    (!req.body.vehicle || typeof req.body.vehicle !== 'object')
  ) {
    return next(new AppError('Vehicle information is required for riders', 400));
  }

  next();
};
