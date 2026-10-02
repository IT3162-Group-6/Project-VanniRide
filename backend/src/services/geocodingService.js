const AppError = require('../utils/appError');
const config = require('../config/env');

const cache = new Map();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

const normalizeBaseUrl = (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new AppError('GEOCODING_BASE_URL is not configured correctly', 500);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AppError('GEOCODING_BASE_URL must use HTTP or HTTPS', 500);
  }
  return url.toString().replace(/\/$/, '');
};

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const requestJson = async (pathname, query, options = {}) => {
  const fetchImplementation = options.fetchImplementation || global.fetch;
  if (typeof fetchImplementation !== 'function') {
    throw new AppError('The geocoding HTTP client is unavailable', 500);
  }

  const baseUrl = normalizeBaseUrl(options.baseUrl || config.geocodingBaseUrl);
  const userAgent = String(
    options.userAgent || config.geocodingUserAgent || ''
  ).trim();
  if (!userAgent) {
    throw new AppError('GEOCODING_USER_AGENT is required', 500);
  }

  const minIntervalMs = Math.max(
    0,
    Number(options.minIntervalMs ?? config.geocodingMinIntervalMs) || 0
  );
  const timeoutMs = Math.max(
    100,
    Number(options.timeoutMs || config.geocodingTimeoutMs) || 5000
  );
  const cacheTtlMs = Math.max(
    0,
    Number(options.cacheTtlMs ?? config.geocodingCacheTtlMs) || 0
  );
  const url = new URL(`${baseUrl}${pathname}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  if (config.geocodingContact) {
    url.searchParams.set('email', config.geocodingContact);
  }

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) cache.delete(cacheKey);

  const performRequest = async () => {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < minIntervalMs) await wait(minIntervalMs - elapsed);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      lastRequestAt = Date.now();
      const response = await fetchImplementation(url, {
        headers: {
          accept: 'application/json',
          'user-agent': userAgent,
        },
        signal: controller.signal,
      });
      if (response.status === 429) {
        throw new AppError('The geocoding service is temporarily rate limited', 429);
      }
      if (!response.ok) {
        throw new AppError('The geocoding service is unavailable', 503);
      }
      const value = await response.json();
      if (cacheTtlMs > 0) {
        cache.set(cacheKey, { value, expiresAt: Date.now() + cacheTtlMs });
      }
      return value;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.name === 'AbortError') {
        throw new AppError('The geocoding service timed out', 503);
      }
      throw new AppError('The geocoding service is unavailable', 503);
    } finally {
      clearTimeout(timeout);
    }
  };

  const queued = requestQueue.then(performRequest, performRequest);
  requestQueue = queued.catch(() => {});
  return queued;
};

const serializePlace = (place) => {
  const latitude = Number(place.lat);
  const longitude = Number(place.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    displayName: String(place.display_name || '').trim(),
    latitude,
    longitude,
    providerPlaceId: String(place.place_id || ''),
  };
};

const searchPlaces = async (query, options = {}) => {
  const limit = Math.min(
    10,
    Math.max(1, Number(options.limit || config.geocodingResultLimit) || 5)
  );
  const payload = await requestJson(
    '/search',
    { q: query, format: 'jsonv2', limit, addressdetails: 1 },
    options
  );
  if (!Array.isArray(payload)) {
    throw new AppError('The geocoding service returned an invalid response', 503);
  }
  return payload.map(serializePlace).filter(Boolean);
};

const reverseGeocode = async (latitude, longitude, options = {}) => {
  const payload = await requestJson(
    '/reverse',
    { lat: latitude, lon: longitude, format: 'jsonv2', addressdetails: 1 },
    options
  );
  const place = serializePlace(payload || {});
  if (!place) {
    throw new AppError('No address was found for the selected location', 404);
  }
  return place;
};

const clearGeocodingCache = () => {
  cache.clear();
  requestQueue = Promise.resolve();
  lastRequestAt = 0;
};

module.exports = {
  clearGeocodingCache,
  reverseGeocode,
  searchPlaces,
};
