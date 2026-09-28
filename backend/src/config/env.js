require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  routingBaseUrl: process.env.ROUTING_BASE_URL,
  routingProfile: process.env.ROUTING_PROFILE || 'driving',
  routingAlternatives: Number(process.env.ROUTING_ALTERNATIVES || 3),
  routingTimeoutMs: Number(process.env.ROUTING_TIMEOUT_MS || 5000),
};
