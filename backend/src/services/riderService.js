const AppError = require('../utils/appError');
const Rider = require('../models/riderModel');
const User = require('../models/userModel');

const VEHICLE_FIELDS = [
  ['type', 50],
  ['model', 100],
  ['registrationNumber', 30],
  ['color', 50],
];

const normalizeVehicle = (vehicle) => {
  if (!vehicle || typeof vehicle !== 'object' || Array.isArray(vehicle)) {
    throw new AppError('Complete vehicle information is required', 400);
  }

  const normalized = {};
  for (const [field, maxLength] of VEHICLE_FIELDS) {
    const value = String(vehicle[field] || '').trim();
    if (!value) {
      throw new AppError(`Vehicle ${field} is required`, 400);
    }
    if (value.length > maxLength) {
      throw new AppError(
        `Vehicle ${field} cannot exceed ${maxLength} characters`,
        400
      );
    }
    normalized[field] = value;
  }

  const registrationNumber = normalized.registrationNumber.toUpperCase();
  if (!/^[A-Z0-9 -]+$/.test(registrationNumber)) {
    throw new AppError(
      'Vehicle registration number may contain only letters, numbers, spaces, and hyphens',
      400
    );
  }

  return {
    type: normalized.type,
    model: normalized.model,
    registration_number: registrationNumber,
    color: normalized.color,
  };
};

const serializeVehicle = (vehicle) =>
  vehicle
    ? {
        type: vehicle.type,
        model: vehicle.model,
        registrationNumber: vehicle.registration_number,
        color: vehicle.color,
      }
    : null;

const serializeRiderProfile = (riderDocument) => {
  if (!riderDocument) return null;
  const rider = riderDocument.toObject
    ? riderDocument.toObject()
    : riderDocument;

  return {
    id: rider._id.toString(),
    userId: rider.user_id.toString(),
    availabilityStatus: rider.availability_status,
    vehicle: serializeVehicle(rider.vehicle),
    approvalStatus: rider.approval_status,
    reviewReason: rider.review_reason || null,
    reviewedBy: rider.reviewed_by?.toString() || null,
    reviewedAt: rider.reviewed_at || null,
    createdAt: rider.created_at,
    updatedAt: rider.updated_at,
  };
};

const assertRiderApproved = (rider) => {
  if (rider.approval_status !== 'APPROVED') {
    throw new AppError(
      `Rider approval is ${String(rider.approval_status || 'PENDING').toLowerCase()}`,
      403
    );
  }
};

const releaseRiderAfterRide = async (riderUserId) => {
  if (!riderUserId) return null;
  const [rider, user] = await Promise.all([
    Rider.findOne({ user_id: riderUserId }),
    User.findById(riderUserId).select('account_status').lean(),
  ]);
  if (!rider) {
    throw new AppError('Assigned rider profile not found', 409);
  }

  const availabilityStatus =
    rider.approval_status === 'APPROVED' && user?.account_status === 'ACTIVE'
      ? 'AVAILABLE'
      : 'UNAVAILABLE';
  rider.availability_status = availabilityStatus;
  await rider.save();
  return availabilityStatus;
};

module.exports = {
  assertRiderApproved,
  normalizeVehicle,
  releaseRiderAfterRide,
  serializeRiderProfile,
  serializeVehicle,
};
