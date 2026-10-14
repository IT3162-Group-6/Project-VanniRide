const assert = require('node:assert/strict');
const test = require('node:test');

const { calculateRoadRoute } = require('../src/services/routingService');

const pickup = { longitude: 80.4, latitude: 8.75 };
const destination = { longitude: 80.41, latitude: 8.76 };

test('uses the current HeiGIT directions endpoint', async () => {
  let requestedUrl;
  const route = await calculateRoadRoute(pickup, destination, {
    provider: 'openrouteservice',
    baseUrl: 'https://api.heigit.org',
    apiKey: 'test-key',
    alternatives: 1,
    fetchImplementation: async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          features: [
            {
              geometry: {
                type: 'LineString',
                coordinates: [[80.4, 8.75], [80.41, 8.76]],
              },
              properties: { summary: { distance: 1500, duration: 180 } },
            },
          ],
        }),
      };
    },
  });

  assert.equal(
    requestedUrl,
    'https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson'
  );
  assert.equal(route.distanceKm, 1.5);
  assert.equal(route.durationMinutes, 3);
});

test('falls back to free OSRM routing when the primary provider fails', async () => {
  const requestedUrls = [];
  const route = await calculateRoadRoute(pickup, destination, {
    provider: 'openrouteservice',
    baseUrl: 'https://api.heigit.org',
    fallbackBaseUrl: 'https://router.project-osrm.org',
    apiKey: 'test-key',
    alternatives: 1,
    fetchImplementation: async (url) => {
      requestedUrls.push(url);
      if (requestedUrls.length === 1) return { ok: false, status: 403 };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          code: 'Ok',
          routes: [
            {
              distance: 1700,
              duration: 240,
              geometry: {
                type: 'LineString',
                coordinates: [[80.4, 8.75], [80.41, 8.76]],
              },
            },
          ],
        }),
      };
    },
  });

  assert.equal(requestedUrls.length, 2);
  assert.match(
    requestedUrls[1],
    /^https:\/\/router\.project-osrm\.org\/route\/v1\/driving\//
  );
  assert.equal(route.distanceKm, 1.7);
  assert.equal(route.durationMinutes, 4);
});
