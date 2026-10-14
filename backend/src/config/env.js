require('dotenv').config();

const DEFAULT_DEVELOPMENT_ROUTING_BASE_URL =
  'https://router.project-osrm.org';

const parseOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
};

const nodeEnv = process.env.NODE_ENV || 'development';
const openRouteServiceApiKey = String(
  process.env.OPENROUTESERVICE_API_KEY || ''
).trim();

const config = {
  port: process.env.PORT || 5000,
  nodeEnv,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  universityEmailDomain: String(
    process.env.UNIVERSITY_EMAIL_DOMAIN || 'vau.ac.lk'
  ).trim().toLowerCase().replace(/^@+/, ''),
  allowNonUniversityEmails: parseBoolean(
    process.env.ALLOW_NON_UNIVERSITY_EMAILS,
    nodeEnv !== 'production'
  ),
  mapProvider:
    process.env.MAP_PROVIDER ||
    (openRouteServiceApiKey ? 'openrouteservice' : 'osrm-nominatim'),
  openRouteServiceBaseUrl:
    process.env.OPENROUTESERVICE_BASE_URL ||
    'https://api.heigit.org',
  openRouteServiceRoutingBaseUrl:
    process.env.OPENROUTESERVICE_ROUTING_BASE_URL ||
    'https://api.openrouteservice.org',
  openRouteServiceApiKey,
  openRouteServiceProfile:
    process.env.OPENROUTESERVICE_PROFILE || 'driving-car',
  // Keep local development usable when an older .env file predates the
  // routing settings. Production still has to configure its provider
  // explicitly in validateRuntimeConfig below.
  routingBaseUrl:
    process.env.ROUTING_BASE_URL || DEFAULT_DEVELOPMENT_ROUTING_BASE_URL,
  routingBaseUrlConfigured: Boolean(
    String(process.env.ROUTING_BASE_URL || '').trim()
  ),
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
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(candidate.universityEmailDomain || '')) {
    errors.push('UNIVERSITY_EMAIL_DOMAIN must be a valid domain');
  }
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
  if (!['openrouteservice', 'osrm-nominatim'].includes(candidate.mapProvider)) {
    errors.push('MAP_PROVIDER must be openrouteservice or osrm-nominatim');
  }
  if (candidate.mapProvider === 'openrouteservice') {
    try {
      const providerUrl = new URL(candidate.openRouteServiceBaseUrl);
      if (!['http:', 'https:'].includes(providerUrl.protocol)) {
        errors.push('OPENROUTESERVICE_BASE_URL must use HTTP or HTTPS');
      }
    } catch {
      errors.push('OPENROUTESERVICE_BASE_URL must be a valid URL');
    }
    try {
      const routingProviderUrl = new URL(
        candidate.openRouteServiceRoutingBaseUrl ||
          'https://api.openrouteservice.org'
      );
      if (!['http:', 'https:'].includes(routingProviderUrl.protocol)) {
        errors.push(
          'OPENROUTESERVICE_ROUTING_BASE_URL must use HTTP or HTTPS'
        );
      }
    } catch {
      errors.push('OPENROUTESERVICE_ROUTING_BASE_URL must be a valid URL');
    }
    if (!String(candidate.openRouteServiceApiKey || '').trim()) {
      errors.push('OPENROUTESERVICE_API_KEY is required');
    }
  }
  try {
    const routingUrl = new URL(candidate.routingBaseUrl);
    if (!['http:', 'https:'].includes(routingUrl.protocol)) {
      errors.push('ROUTING_BASE_URL must use HTTP or HTTPS');
    }
  } catch {
    errors.push('ROUTING_BASE_URL must be a valid URL');
  }
  if (candidate.nodeEnv === 'production') {
    if (candidate.allowNonUniversityEmails) {
      errors.push('ALLOW_NON_UNIVERSITY_EMAILS cannot be enabled in production');
    }
    if (
      String(candidate.jwtSecret || '').length < 32 ||
      /replace|secret|example/i.test(String(candidate.jwtSecret || ''))
    ) {
      errors.push('Production JWT_SECRET must be a non-placeholder value of at least 32 characters');
    }
    if (!candidate.corsOriginsConfigured || candidate.corsOrigins.length === 0) {
      errors.push('CORS_ORIGINS must be explicitly configured in production');
    }
    if (candidate.mapProvider !== 'openrouteservice') {
      errors.push('MAP_PROVIDER must be openrouteservice in production');
    }
  }
  if (errors.length) {
    throw new Error(`Invalid runtime configuration: ${errors.join('; ')}`);
  }
  return candidate;
};

module.exports = { ...config, validateRuntimeConfig };
