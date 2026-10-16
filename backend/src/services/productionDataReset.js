const mongoose = require('mongoose');
const AdminAuditLog = require('../models/adminAuditLogModel');
const Cancellation = require('../models/cancellationModel');
const CancellationRequest = require('../models/cancellationRequestModel');
const ChatAccessRequest = require('../models/chatAccessRequestModel');
const IgnoredRideRequest = require('../models/ignoredRideRequestModel');
const Message = require('../models/messageModel');
const Notification = require('../models/notificationModel');
const PasswordResetRequest = require('../models/passwordResetRequestModel');
const PasswordResetToken = require('../models/passwordResetTokenModel');
const Payment = require('../models/paymentModel');
const Rating = require('../models/ratingModel');
const Ride = require('../models/rideModel');
const Rider = require('../models/riderModel');
const User = require('../models/userModel');

const RESET_ID = 'preserve-admins-clear-app-data-2026-10-16-v1';

const operationalModels = [
  AdminAuditLog,
  Cancellation,
  CancellationRequest,
  ChatAccessRequest,
  IgnoredRideRequest,
  Message,
  Notification,
  PasswordResetRequest,
  PasswordResetToken,
  Payment,
  Rating,
  Ride,
  Rider,
];

const resetNonAdminProductionDataOnce = async () => {
  const markers = mongoose.connection.db.collection('maintenance_markers');
  const previousRun = await markers.findOne({ _id: RESET_ID });
  if (previousRun?.status === 'COMPLETE') {
    return {
      release: RESET_ID,
      status: 'COMPLETE',
      adminAccountsPreserved: previousRun.admin_accounts_preserved,
      alreadyApplied: true,
    };
  }

  const adminAccounts = await User.find({
    $or: [{ role: 'ADMIN' }, { roles: 'ADMIN' }],
  }).select('_id email');
  if (adminAccounts.length === 0) {
    throw new Error('Production data reset refused because no administrator accounts exist');
  }

  await markers.updateOne(
    { _id: RESET_ID },
    {
      $set: {
        status: 'RUNNING',
        started_at: new Date(),
        admin_accounts_preserved: adminAccounts.length,
      },
      $unset: { completed_at: '', deleted_counts: '' },
    },
    { upsert: true }
  );

  const deletedCounts = {};
  for (const Model of operationalModels) {
    const result = await Model.deleteMany({});
    deletedCounts[Model.collection.collectionName] = result.deletedCount;
  }

  const userResult = await User.deleteMany({
    $nor: [{ role: 'ADMIN' }, { roles: 'ADMIN' }],
  });
  deletedCounts.users = userResult.deletedCount;

  const completedAt = new Date();
  await markers.updateOne(
    { _id: RESET_ID },
    {
      $set: {
        status: 'COMPLETE',
        completed_at: completedAt,
        admin_accounts_preserved: adminAccounts.length,
        deleted_counts: deletedCounts,
      },
    }
  );

  console.log(
    `Production data reset complete: ${JSON.stringify({
      release: RESET_ID,
      adminAccountsPreserved: adminAccounts.length,
      deletedCounts,
    })}`
  );
  return {
    release: RESET_ID,
    status: 'COMPLETE',
    adminAccountsPreserved: adminAccounts.length,
    alreadyApplied: false,
  };
};

module.exports = { RESET_ID, resetNonAdminProductionDataOnce };
