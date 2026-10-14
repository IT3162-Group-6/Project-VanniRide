const AppError = require('../utils/appError');


exports.validateRegister = (req, res, next) => {
  const { name, phone, password, role } = req.body || {};
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!name || !email || !phone || !password || !role) {
    return next(new AppError('All fields (name, email, phone, password, role) are required', 400));
  }

  const universityEmailRegex = /^[a-zA-Z0-9._%+-]+@vau\.ac\.lk$/i;
  if (!universityEmailRegex.test(email)) {
    return next(new AppError('Please use your University of Vavuniya email address (@vau.ac.lk).', 400));
  }

  if (typeof password !== 'string' || password.length < 6) {
    return next(new AppError('Password must be at least 6 characters long', 400));
  }

  if (!['CUSTOMER', 'RIDER'].includes(String(role).toUpperCase())) {
    return next(new AppError('Role must be CUSTOMER or RIDER', 400));
  }

  if (
    String(role).toUpperCase() === 'RIDER' &&
    (!req.body.vehicle || typeof req.body.vehicle !== 'object')
  ) {
    return next(new AppError('Vehicle information is required for riders', 400));
  }

  next();
};
