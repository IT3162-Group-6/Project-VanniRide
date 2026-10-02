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
  geocodingBaseUrl:
    process.env.GEOCODING_BASE_URL || 'https://nominatim.openstreetmap.org',
  geocodingUserAgent:
    process.env.GEOCODING_USER_AGENT || 'VanniRide/1.0 (academic project)',
  geocodingContact: process.env.GEOCODING_CONTACT || '',
  geocodingMinIntervalMs: Number(
    process.env.GEOCODING_MIN_INTERVAL_MS || 1000
  ),
  geocodingCacheTtlMs: Number(
    process.env.GEOCODING_CACHE_TTL_MS || 24 * 60 * 60 * 1000
  ),
  geocodingTimeoutMs: Number(process.env.GEOCODING_TIMEOUT_MS || 5000),
  geocodingResultLimit: Number(process.env.GEOCODING_RESULT_LIMIT || 5),
  cancellationSweepIntervalMs: Number(
    process.env.CANCELLATION_SWEEP_INTERVAL_MS || 30000
  ),
};
