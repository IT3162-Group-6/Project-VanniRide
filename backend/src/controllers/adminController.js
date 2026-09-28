const AppError = require('../utils/appError');
const users = require('../models/userModel');
const rides = require('../models/rideModel');

exports.getAllUsers = async (req, res, next) => {
  try {
    const userList = users.map((u) => {
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });

    res.status(200).json({
      success: true,
      count: userList.length,
      data: { users: userList },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { accountStatus } = req.body;

    const validStatuses = ['ACTIVE', 'BLOCKED', 'SUSPENDED'];
    if (!validStatuses.includes(accountStatus)) {
      return next(
        new AppError('Invalid account status. Allowed: ACTIVE, BLOCKED, SUSPENDED', 400)
      );
    }

    const userIndex = users.findIndex((u) => u.id === parseInt(userId, 10));

    if (userIndex === -1) {
      return next(new AppError('User not found', 404));
    }

    users[userIndex].accountStatus = accountStatus;

    const updatedUser = { ...users[userIndex] };
    delete updatedUser.password;

    res.status(200).json({
      success: true,
      message: `User status updated to ${accountStatus}`,
      data: { user: updatedUser },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllRides = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      count: rides.length,
      data: { rides },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAdminStatistics = async (req, res, next) => {
  try {
    const totalUsers = users.length;
    const totalCustomers = users.filter((u) => u.role === 'CUSTOMER').length;
    const totalRiders = users.filter((u) => u.role === 'ADMIN' ? false : u.role === 'RIDER').length;

    const totalRides = rides.length;
    const completedRides = rides.filter((r) => r.status === 'COMPLETED').length;
    const cancelledRides = rides.filter((r) => r.status === 'CANCELLED').length;
    const activeRides = rides.filter((r) =>
      ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED'].includes(r.status)
    ).length;

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          users: {
            totalUsers,
            totalCustomers,
            totalRiders,
          },
          rides: {
            totalRides,
            completedRides,
            cancelledRides,
            activeRides,
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
};