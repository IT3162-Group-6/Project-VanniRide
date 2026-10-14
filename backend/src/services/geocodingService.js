const AppError = require('../utils/appError');
const config = require('../config/env');

const cache = new Map();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

// Nominatim view boxes use: left longitude, top latitude, right longitude,
// bottom latitude. This box keeps discovery within Sri Lanka's Northern Province.
const NORTHERN_PROVINCE_VIEWBOX = '79.45,10.15,81.05,8.20';
const NORTHERN_PROVINCE_BOUNDS = {
  minLongitude: 79.45,
  maxLatitude: 10.15,
  maxLongitude: 81.05,
  minLatitude: 8.2,
};

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

const requestOpenRouteServiceJson = async (pathname, query, options = {}) => {
  const fetchImplementation = options.fetchImplementation || global.fetch;
  if (typeof fetchImplementation !== 'function') {
    throw new AppError('The geocoding HTTP client is unavailable', 500);
  }

  const baseUrl = normalizeBaseUrl(
    options.baseUrl || config.openRouteServiceBaseUrl
  );
  const apiKey = String(
    options.apiKey || config.openRouteServiceApiKey || ''
  ).trim();
  if (!apiKey) {
    throw new AppError('OPENROUTESERVICE_API_KEY is required', 500);
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
  Object.entries({ api_key: apiKey, ...query }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

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
        headers: { accept: 'application/geo+json, application/json' },
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

const compactDisplayName = (place) => {
  const address = place.address || {};
  const candidates = [
    place.name,
    address.amenity,
    address.university,
    address.hospital,
    address.building,
    address.shop,
    address.tourism,
    address.road,
    address.neighbourhood,
    address.suburb,
    address.village,
    address.town,
    address.city,
    address.county,
  ];
  const parts = [];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (!value || parts.some((part) => part.toLowerCase() === value.toLowerCase())) {
      continue;
    }
    parts.push(value);
    if (parts.length === 3) break;
  }
  return parts.join(', ') || String(place.display_name || '').trim();
};

const isNorthernProvincePlace = (place) => {
  const address = place.address || {};
  const state = String(address.state || '').trim().toLowerCase();
  const provinceCode = String(address['ISO3166-2-lvl4'] || '').trim().toUpperCase();
  return state === 'northern province' || provinceCode === 'LK-4';
};

const serializePlace = (place) => {
  const latitude = Number(place.lat);
  const longitude = Number(place.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    displayName: compactDisplayName(place),
    fullDisplayName: String(place.display_name || '').trim(),
    latitude,
    longitude,
    providerPlaceId: String(place.place_id || ''),
  };
};

const isWithinNorthernProvinceBounds = (latitude, longitude) =>
  latitude >= NORTHERN_PROVINCE_BOUNDS.minLatitude &&
  latitude <= NORTHERN_PROVINCE_BOUNDS.maxLatitude &&
  longitude >= NORTHERN_PROVINCE_BOUNDS.minLongitude &&
  longitude <= NORTHERN_PROVINCE_BOUNDS.maxLongitude;

const serializeOpenRouteServicePlace = (feature) => {
  const coordinates = feature?.geometry?.coordinates;
  const properties = feature?.properties || {};
  const longitude = Number(coordinates?.[0]);
  const latitude = Number(coordinates?.[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const parts = [];
  for (const candidate of [
    properties.name,
    properties.locality,
    properties.localadmin,
    properties.county,
    properties.region,
  ]) {
    const value = String(candidate || '').trim();
    if (!value || parts.some((part) => part.toLowerCase() === value.toLowerCase())) {
      continue;
    }
    parts.push(value);
    if (parts.length === 3) break;
  }

  return {
    displayName: parts.join(', ') || String(properties.label || '').trim(),
    fullDisplayName: String(properties.label || properties.name || '').trim(),
    latitude,
    longitude,
    providerPlaceId: String(properties.gid || properties.id || ''),
  };
};

const searchOpenRouteServicePlaces = async (query, options, limit) => {
  const payload = await requestOpenRouteServiceJson(
    '/pelias/v1/autocomplete',
    {
      text: query,
      size: limit,
      lang: 'en',
      'boundary.country': 'LK',
      'boundary.rect.min_lon': NORTHERN_PROVINCE_BOUNDS.minLongitude,
      'boundary.rect.max_lat': NORTHERN_PROVINCE_BOUNDS.maxLatitude,
      'boundary.rect.max_lon': NORTHERN_PROVINCE_BOUNDS.maxLongitude,
      'boundary.rect.min_lat': NORTHERN_PROVINCE_BOUNDS.minLatitude,
    },
    options
  );
  if (!Array.isArray(payload?.features)) {
    throw new AppError('The geocoding service returned an invalid response', 503);
  }
  return payload.features
    .map(serializeOpenRouteServicePlace)
    .filter(
      (place) =>
        place &&
        isWithinNorthernProvinceBounds(place.latitude, place.longitude)
    );
};

const reverseOpenRouteServicePlace = async (latitude, longitude, options) => {
  const payload = await requestOpenRouteServiceJson(
    '/pelias/v1/reverse',
    {
      'point.lat': latitude,
      'point.lon': longitude,
      size: 1,
      lang: 'en',
    },
    options
  );
  const place = serializeOpenRouteServicePlace(payload?.features?.[0]);
  if (!place) {
    throw new AppError('No address was found for the selected location', 404);
  }
  return place;
};

const getNominatimFallbackOptions = (options = {}) => ({
  ...options,
  baseUrl: options.fallbackBaseUrl || config.geocodingBaseUrl,
});

const searchNominatimPlaces = async (query, options, limit) => {
  const payload = await requestJson(
    '/search',
    {
      q: query,
      format: 'jsonv2',
      limit,
      addressdetails: 1,
      'accept-language': 'en',
      countrycodes: 'lk',
      viewbox: NORTHERN_PROVINCE_VIEWBOX,
      bounded: 1,
    },
    options
  );
  if (!Array.isArray(payload)) {
    throw new AppError('The geocoding service returned an invalid response', 503);
  }
  return payload
    .filter(isNorthernProvincePlace)
    .map(serializePlace)
    .filter(Boolean);
};

const reverseNominatimPlace = async (latitude, longitude, options) => {
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

const searchPlaces = async (query, options = {}) => {
  const limit = Math.min(
    10,
    Math.max(1, Number(options.limit || config.geocodingResultLimit) || 5)
  );
  const provider = options.provider || config.mapProvider;
  if (provider === 'openrouteservice') {
    try {
      return await searchOpenRouteServicePlaces(query, options, limit);
    } catch (primaryError) {
      try {
        return await searchNominatimPlaces(
          query,
          getNominatimFallbackOptions(options),
          limit
        );
      } catch {
        throw primaryError;
      }
    }
  }
  if (provider !== 'osrm-nominatim') {
    throw new AppError('The configured map provider is not supported', 500);
  }
  return searchNominatimPlaces(query, options, limit);
};

const reverseGeocode = async (latitude, longitude, options = {}) => {
  const provider = options.provider || config.mapProvider;
  if (provider === 'openrouteservice') {
    try {
      return await reverseOpenRouteServicePlace(latitude, longitude, options);
    } catch (primaryError) {
      try {
        return await reverseNominatimPlace(
          latitude,
          longitude,
          getNominatimFallbackOptions(options)
        );
      } catch {
        throw primaryError;
      }
    }
  }
  if (provider !== 'osrm-nominatim') {
    throw new AppError('The configured map provider is not supported', 500);
  }
  return reverseNominatimPlace(latitude, longitude, options);
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
