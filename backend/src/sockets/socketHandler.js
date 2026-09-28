const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Ride = require('../models/rideModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const {
  assertChatSendingAllowed,
  normalizeMessageText,
  serializeMessage,
} = require('../services/chatService');
const { rideRoom, userRoom } = require('../utils/socketEvents');

const getToken = (socket) => {
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }

  const authorization = socket.handshake.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7);
  }

  return null;
};

const findCurrentSocketUser = async (tokenUser) => {
  const user = await User.findById(tokenUser.id)
    .select('role account_status token_version')
    .lean();
  if (!user) {
    throw new Error('The user belonging to this token no longer exists');
  }
  if (user.account_status !== 'ACTIVE') {
    throw new Error('This account is suspended');
  }
  if (
    user.role !== tokenUser.role ||
    !Number.isInteger(tokenUser.tokenVersion) ||
    user.token_version !== tokenUser.tokenVersion
  ) {
    throw new Error('This session is no longer valid');
  }
  return user;
};

const findParticipantRide = async (rideId, socketUser) => {
  if (!mongoose.isValidObjectId(rideId)) {
    throw new Error('Invalid ride ID');
  }

  const ride = await Ride.findById(rideId).lean();
  if (!ride) {
    throw new Error('Ride not found');
  }

  const userId = new mongoose.Types.ObjectId(socketUser.id);
  const isCustomer =
    socketUser.role === 'CUSTOMER' && ride.customer_id.equals(userId);
  const isRider =
    socketUser.role === 'RIDER' && ride.rider_id?.equals(userId);

  if (!isCustomer && !isRider) {
    throw new Error('You are not authorized to access this ride');
  }

  return { ride, userId };
};

const respond = (acknowledge, payload) => {
  if (typeof acknowledge === 'function') {
    acknowledge(payload);
  }
};

const initializeSocketHandler = (io, config) => {
  io.use(async (socket, next) => {
    try {
      const token = getToken(socket);
      if (!token || !config.jwtSecret) {
        return next(new Error('Authentication is required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      if (
        !mongoose.isValidObjectId(decoded.id) ||
        !['CUSTOMER', 'RIDER', 'ADMIN'].includes(decoded.role)
      ) {
        return next(new Error('Invalid authentication token'));
      }

      socket.user = {
        id: decoded.id,
        role: decoded.role,
        tokenVersion: decoded.tokenVersion,
      };
      await findCurrentSocketUser(socket.user);
      return next();
    } catch (error) {
      return next(
        new Error(
          ['JsonWebTokenError', 'TokenExpiredError'].includes(error.name)
            ? 'Invalid or expired authentication token'
            : error.message || 'Invalid authentication token'
        )
      );
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.user.id));
    socket.join(`role_${socket.user.role}`);

    socket.on('join_ride', async ({ rideId } = {}, acknowledge) => {
      try {
        await findCurrentSocketUser(socket.user);
        await findParticipantRide(rideId, socket.user);
        await socket.join(rideRoom(rideId));
        respond(acknowledge, { success: true, rideId });
      } catch (error) {
        respond(acknowledge, { success: false, message: error.message });
      }
    });

    socket.on(
      'send_message',
      async ({ rideId, messageText } = {}, acknowledge) => {
        try {
          await findCurrentSocketUser(socket.user);
          const { ride, userId } = await findParticipantRide(
            rideId,
            socket.user
          );
          await assertChatSendingAllowed(ride);
          const normalizedMessage = normalizeMessageText(messageText);

          const message = await Message.create({
            ride_id: ride._id,
            sender_id: userId,
            message_text: normalizedMessage,
          });
          const payload = serializeMessage(message);

          io.to(rideRoom(rideId)).emit('new_message', payload);
          respond(acknowledge, { success: true, data: { message: payload } });
        } catch (error) {
          respond(acknowledge, { success: false, message: error.message });
        }
      }
    );
  });
};

module.exports = initializeSocketHandler;
