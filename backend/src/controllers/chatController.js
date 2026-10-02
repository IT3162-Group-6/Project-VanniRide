const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const {
  getAuthenticatedUser,
  validateObjectId,
} = require('../utils/authenticatedUser');
const Message = require('../models/messageModel');
const Ride = require('../models/rideModel');
const ChatAccessRequest = require('../models/chatAccessRequestModel');
const {
  assertChatSendingAllowed,
  findActiveChatAccess,
  normalizeMessageText,
  serializeChatAccessRequest,
  serializeMessage,
} = require('../services/chatService');
const {
  emitChatAccessUpdated,
  emitNewMessage,
} = require('../utils/socketEvents');

const getParticipantRide = async (rideId, userId, role) => {
  validateObjectId(rideId, 'ride ID');
  const ride = await Ride.findById(rideId).lean();

  if (!ride) {
    throw new AppError('Ride not found', 404);
  }

  const isCustomer = role === 'CUSTOMER' && ride.customer_id.equals(userId);
  const isRider = role === 'RIDER' && ride.rider_id?.equals(userId);
  if (!isCustomer && !isRider) {
    throw new AppError('You are not authorized to access this conversation', 403);
  }

  return ride;
};

exports.getMessages = catchAsync(async (req, res) => {
  const { userId, role } = getAuthenticatedUser(req, ['CUSTOMER', 'RIDER']);
  const ride = await getParticipantRide(req.params.rideId, userId, role);
  const messages = await Message.find({ ride_id: ride._id })
    .sort({ sent_at: 1 })
    .lean();
  const activeAccess =
    ride.status === 'COMPLETED' ? await findActiveChatAccess(ride._id) : null;
  const pendingRequest = await ChatAccessRequest.findOne({
    ride_id: ride._id,
    status: 'PENDING',
  }).lean();
  const activeRideCanSend = ['ACCEPTED', 'ARRIVED', 'STARTED'].includes(
    ride.status
  );

  res.status(200).json({
    success: true,
    results: messages.length,
    data: {
      messages: messages.map(serializeMessage),
      chatAccess: {
        canSend: activeRideCanSend || Boolean(activeAccess),
        mode: activeRideCanSend
          ? 'ACTIVE_RIDE'
          : activeAccess
            ? 'POST_COMPLETION_APPROVAL'
            : 'READ_ONLY',
        pendingRequest: pendingRequest
          ? serializeChatAccessRequest(pendingRequest)
          : null,
        approvedUntil: activeAccess?.approved_until || null,
      },
    },
  });
});

exports.sendMessage = catchAsync(async (req, res) => {
  const { userId, role } = getAuthenticatedUser(req, ['CUSTOMER', 'RIDER']);
  const ride = await getParticipantRide(req.params.rideId, userId, role);
  await assertChatSendingAllowed(ride);
  const messageText = normalizeMessageText(req.body.messageText);

  const message = await Message.create({
    ride_id: ride._id,
    sender_id: userId,
    message_text: messageText,
  });
  emitNewMessage(req, message);

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: { message: serializeMessage(message) },
  });
});

exports.requestPostCompletionAccess = catchAsync(async (req, res) => {
  const { userId, role } = getAuthenticatedUser(req, ['CUSTOMER']);
  const ride = await getParticipantRide(req.params.rideId, userId, role);

  if (ride.status !== 'COMPLETED') {
    throw new AppError(
      'Post-completion chat access can only be requested for a completed ride',
      409
    );
  }
  if (!ride.rider_id) {
    throw new AppError('Completed ride has no assigned rider', 409);
  }

  const reason = String(req.body.reason || '').trim();
  if (!reason) {
    throw new AppError('Access request reason is required', 400);
  }
  if (reason.length > 500) {
    throw new AppError('Access request reason cannot exceed 500 characters', 400);
  }

  const activeAccess = await findActiveChatAccess(ride._id);
  if (activeAccess) {
    throw new AppError(
      'Post-completion chat access is already active for this ride',
      409
    );
  }

  let chatAccessRequest;
  try {
    chatAccessRequest = await ChatAccessRequest.create({
      ride_id: ride._id,
      requested_by: userId,
      rider_id: ride.rider_id,
      reason,
      status: 'PENDING',
      reviewed_by: null,
      reviewed_at: null,
      approved_from: null,
      approved_until: null,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(
        'A post-completion chat access request is already pending',
        409
      );
    }
    throw error;
  }

  emitChatAccessUpdated(req, ride, chatAccessRequest);
  res.status(201).json({
    success: true,
    message: 'Post-completion chat access request submitted',
    data: {
      chatAccessRequest: serializeChatAccessRequest(chatAccessRequest),
    },
  });
});
