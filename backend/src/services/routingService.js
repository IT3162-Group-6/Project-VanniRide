const AppError = require('../utils/appError');
const config = require('../config/env');

const normalizeBaseUrl = (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new AppError('ROUTING_BASE_URL is not configured correctly', 500);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AppError('ROUTING_BASE_URL must use HTTP or HTTPS', 500);
  }

  return url.toString().replace(/\/$/, '');
};

const routeCoordinate = (location) =>
  `${Number(location.longitude)},${Number(location.latitude)}`;

const calculateRoadRoute = async (
  pickupLocation,
  destination,
  options = {}
) => {
  const fetchImplementation = options.fetchImplementation || global.fetch;
  if (typeof fetchImplementation !== 'function') {
    throw new AppError('The routing HTTP client is unavailable', 500);
  }

  const baseUrl = normalizeBaseUrl(options.baseUrl || config.routingBaseUrl);
  const profile = encodeURIComponent(
    options.profile || config.routingProfile || 'driving'
  );
  const configuredAlternatives = Number(
    options.alternatives || config.routingAlternatives
  );
  const alternatives =
    Number.isInteger(configuredAlternatives) && configuredAlternatives > 0
      ? configuredAlternatives
      : 3;
  const configuredTimeoutMs = Number(options.timeoutMs || config.routingTimeoutMs);
  const timeoutMs =
    Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs >= 100
      ? configuredTimeoutMs
      : 5000;
  const coordinates = `${routeCoordinate(pickupLocation)};${routeCoordinate(
    destination
  )}`;
  const url =
    `${baseUrl}/route/v1/${profile}/${coordinates}` +
    `?alternatives=${alternatives}&steps=false&overview=full&geometries=geojson`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImplementation(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AppError('The road-routing service is unavailable', 503);
    }

    const payload = await response.json();
    if (payload.code !== 'Ok' || !Array.isArray(payload.routes)) {
      throw new AppError(
        payload.code === 'NoRoute'
          ? 'No drivable route was found between the supplied locations'
          : 'The road-routing service returned an invalid response',
        503
      );
    }

    const routes = payload.routes
      .map((route) => ({ ...route, numericDistance: Number(route.distance) }))
      .filter(
        (route) =>
          Number.isFinite(route.numericDistance) && route.numericDistance >= 0
      );
    if (routes.length === 0) {
      throw new AppError(
        'The road-routing service did not return a route distance',
        503
      );
    }

    const shortestRoute = routes.reduce((shortest, route) =>
      route.numericDistance < shortest.numericDistance ? route : shortest
    );
    const numericDuration = Number(shortestRoute.duration);
    return {
      distanceKm:
        Math.round((shortestRoute.numericDistance / 1000) * 100) / 100,
      durationMinutes: Number.isFinite(numericDuration)
        ? Math.max(1, Math.round(numericDuration / 60))
        : null,
      routeGeometry:
        shortestRoute.geometry?.type === 'LineString' &&
        Array.isArray(shortestRoute.geometry.coordinates)
          ? shortestRoute.geometry
          : null,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === 'AbortError') {
      throw new AppError('The road-routing service timed out', 503);
    }
    throw new AppError('The road-routing service is unavailable', 503);
  } finally {
    clearTimeout(timeout);
  }
};

const calculateRoadDistanceKm = async (
  pickupLocation,
  destination,
  options = {}
) => {
  const route = await calculateRoadRoute(
    pickupLocation,
    destination,
    options
  );
  return route.distanceKm;
};

module.exports = { calculateRoadDistanceKm, calculateRoadRoute };
