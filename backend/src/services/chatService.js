const AppError = require('../utils/appError');
const ChatAccessRequest = require('../models/chatAccessRequestModel');

const CHAT_ENABLED_STATUSES = Object.freeze([
  'ACCEPTED',
  'ARRIVED',
  'STARTED',
]);

const serializeMessage = (messageDocument) => {
  const message = messageDocument.toObject
    ? messageDocument.toObject()
    : messageDocument;

  return {
    id: message._id.toString(),
    rideId: message.ride_id.toString(),
    senderId: message.sender_id.toString(),
    messageText: message.message_text,
    sentAt: message.sent_at,
  };
};

const serializeChatAccessRequest = (requestDocument) => {
  const request = requestDocument.toObject
    ? requestDocument.toObject()
    : requestDocument;

  return {
    id: request._id.toString(),
    rideId: request.ride_id.toString(),
    requestedBy: request.requested_by.toString(),
    riderId: request.rider_id.toString(),
    reason: request.reason,
    status: request.status,
    reviewedBy: request.reviewed_by?.toString() || null,
    requestedAt: request.requested_at,
    reviewedAt: request.reviewed_at || null,
    approvedFrom: request.approved_from || null,
    approvedUntil: request.approved_until || null,
  };
};

const normalizeMessageText = (value) => {
  const messageText = String(value || '').trim();
  if (!messageText) {
    throw new AppError('Message text is required', 400);
  }
  if (messageText.length > 1000) {
    throw new AppError('Message text cannot exceed 1000 characters', 400);
  }
  return messageText;
};

const expireElapsedChatAccess = async (rideId, now = new Date()) => {
  const filter = {
    status: 'APPROVED',
    approved_until: { $lte: now },
  };
  if (rideId) filter.ride_id = rideId;

  return ChatAccessRequest.updateMany(
    filter,
    { $set: { status: 'EXPIRED' } }
  );
};

const findActiveChatAccess = async (rideId, now = new Date()) => {
  await expireElapsedChatAccess(rideId, now);
  return ChatAccessRequest.findOne({
    ride_id: rideId,
    status: 'APPROVED',
    approved_from: { $lte: now },
    approved_until: { $gt: now },
  }).lean();
};

const assertChatSendingAllowed = async (ride, now = new Date()) => {
  if (CHAT_ENABLED_STATUSES.includes(ride.status)) {
    return { mode: 'ACTIVE_RIDE', accessRequest: null };
  }

  if (ride.status === 'COMPLETED') {
    const accessRequest = await findActiveChatAccess(ride._id, now);
    if (accessRequest) {
      return { mode: 'POST_COMPLETION_APPROVAL', accessRequest };
    }
    throw new AppError(
      'Post-completion messages require active administrator approval',
      409
    );
  }

  throw new AppError(
    'Messages can only be sent during an assigned active ride',
    409
  );
};

module.exports = {
  assertChatSendingAllowed,
  expireElapsedChatAccess,
  findActiveChatAccess,
  normalizeMessageText,
  serializeChatAccessRequest,
  serializeMessage,
};
