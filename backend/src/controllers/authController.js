const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Mock User Data (Database එක හදනකම් පමණි)
const mockUsers = [];

exports.register = catchAsync(async (req, res, next) => {
  const { name, email, role } = req.body;

  if (!name || !email) {
    return next(new AppError('Please provide name and email', 400));
  }

  const newUser = { id: mockUsers.length + 1, name, email, role: role || 'CUSTOMER' };
  mockUsers.push(newUser);

  res.status(201).json({
    success: true,
    message: 'User registered successfully (Mock Data)',
    data: { user: newUser },
  });
});