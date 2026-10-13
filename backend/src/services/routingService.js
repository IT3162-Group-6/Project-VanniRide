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

const calculateOpenRouteServiceRoute = async (
  pickupLocation,
  destination,
  options
) => {
  const fetchImplementation = options.fetchImplementation || global.fetch;
  if (typeof fetchImplementation !== 'function') {
    throw new AppError('The routing HTTP client is unavailable', 500);
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
  const profile = encodeURIComponent(
    options.profile || config.openRouteServiceProfile || 'driving-car'
  );
  const configuredTimeoutMs = Number(options.timeoutMs || config.routingTimeoutMs);
  const timeoutMs =
    Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs >= 100
      ? configuredTimeoutMs
      : 5000;
  const configuredAlternatives = Number(
    options.alternatives || config.routingAlternatives
  );
  const alternativeCount =
    Number.isInteger(configuredAlternatives) && configuredAlternatives > 1
      ? Math.min(3, configuredAlternatives)
      : 1;
  const requestBody = {
    coordinates: [
      [Number(pickupLocation.longitude), Number(pickupLocation.latitude)],
      [Number(destination.longitude), Number(destination.latitude)],
    ],
  };
  if (alternativeCount > 1) {
    requestBody.alternative_routes = {
      target_count: alternativeCount,
      share_factor: 0.6,
      weight_factor: 1.4,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImplementation(
      `${baseUrl}/openrouteservice/v2/directions/${profile}/geojson`,
      {
        method: 'POST',
        headers: {
          accept: 'application/geo+json, application/json',
          authorization: apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }
    );
    if (response.status === 429) {
      throw new AppError('The road-routing service is temporarily rate limited', 429);
    }
    if (!response.ok) {
      throw new AppError('The road-routing service is unavailable', 503);
    }

    const payload = await response.json();
    const routes = Array.isArray(payload.features)
      ? payload.features
          .map((feature) => ({
            geometry: feature?.geometry,
            distance: Number(feature?.properties?.summary?.distance),
            duration: Number(feature?.properties?.summary?.duration),
          }))
          .filter((route) => Number.isFinite(route.distance) && route.distance >= 0)
      : [];
    if (routes.length === 0) {
      throw new AppError(
        'No drivable route was found between the supplied locations',
        503
      );
    }
    const shortestRoute = routes.reduce((shortest, route) =>
      route.distance < shortest.distance ? route : shortest
    );
    return {
      distanceKm: Math.round((shortestRoute.distance / 1000) * 100) / 100,
      durationMinutes: Number.isFinite(shortestRoute.duration)
        ? Math.max(1, Math.round(shortestRoute.duration / 60))
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

const calculateRoadRoute = async (
  pickupLocation,
  destination,
  options = {}
) => {
  const provider = options.provider || config.mapProvider;
  if (provider === 'openrouteservice') {
    return calculateOpenRouteServiceRoute(
      pickupLocation,
      destination,
      options
    );
  }
  if (provider !== 'osrm-nominatim') {
    throw new AppError('The configured map provider is not supported', 500);
  }

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
