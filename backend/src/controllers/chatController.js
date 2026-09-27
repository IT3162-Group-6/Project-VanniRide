const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const {
  getAuthenticatedUser,
  validateObjectId,
} = require('../utils/authenticatedUser');
const Message = require('../models/messageModel');
const Ride = require('../models/rideModel');

const CHAT_ENABLED_STATUSES = ['ACCEPTED', 'ARRIVED', 'STARTED'];

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

  res.status(200).json({
    success: true,
    results: messages.length,
    data: { messages: messages.map(serializeMessage) },
  });
});

exports.sendMessage = catchAsync(async (req, res) => {
  const { userId, role } = getAuthenticatedUser(req, ['CUSTOMER', 'RIDER']);
  const ride = await getParticipantRide(req.params.rideId, userId, role);

  if (!CHAT_ENABLED_STATUSES.includes(ride.status)) {
    throw new AppError(
      'Messages can only be sent during an assigned active ride',
      409
    );
  }

  const messageText = String(req.body.messageText || '').trim();
  if (!messageText) {
    throw new AppError('Message text is required', 400);
  }

  const message = await Message.create({
    ride_id: ride._id,
    sender_id: userId,
    message_text: messageText,
  });

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: { message: serializeMessage(message) },
  });
});
