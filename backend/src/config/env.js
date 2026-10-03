require('dotenv').config();

const parseOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

const config = {
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
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS).length
    ? parseOrigins(process.env.CORS_ORIGINS)
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  corsOriginsConfigured: Boolean(String(process.env.CORS_ORIGINS || '').trim()),
};

const validateRuntimeConfig = (candidate = config) => {
  const errors = [];
  if (!candidate.mongoUri) errors.push('MONGODB_URI is required');
  if (!candidate.jwtSecret) errors.push('JWT_SECRET is required');
  if (!['development', 'test', 'production'].includes(candidate.nodeEnv)) {
    errors.push('NODE_ENV must be development, test, or production');
  }
  if (!Number.isInteger(Number(candidate.port)) || Number(candidate.port) < 1) {
    errors.push('PORT must be a positive integer');
  }
  if (
    !Number.isFinite(candidate.cancellationSweepIntervalMs) ||
    candidate.cancellationSweepIntervalMs < 1000
  ) {
    errors.push('CANCELLATION_SWEEP_INTERVAL_MS must be at least 1000');
  }
  if (candidate.nodeEnv === 'production') {
    if (
      String(candidate.jwtSecret || '').length < 32 ||
      /replace|secret|example/i.test(String(candidate.jwtSecret || ''))
    ) {
      errors.push('Production JWT_SECRET must be a non-placeholder value of at least 32 characters');
    }
    if (!candidate.corsOriginsConfigured || candidate.corsOrigins.length === 0) {
      errors.push('CORS_ORIGINS must be explicitly configured in production');
    }
  }
  if (errors.length) {
    throw new Error(`Invalid runtime configuration: ${errors.join('; ')}`);
  }
  return candidate;
};

module.exports = { ...config, validateRuntimeConfig };
