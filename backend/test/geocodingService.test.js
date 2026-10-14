const assert = require('node:assert/strict');
const test = require('node:test');

const {
  clearGeocodingCache,
  reverseGeocode,
  searchPlaces,
} = require('../src/services/geocodingService');

const fallbackOptions = (fetchImplementation) => ({
  provider: 'openrouteservice',
  apiKey: 'test-api-key',
  baseUrl: 'https://api.heigit.test',
  fallbackBaseUrl: 'https://nominatim.test',
  userAgent: 'VanniRide tests',
  minIntervalMs: 0,
  cacheTtlMs: 0,
  fetchImplementation,
});

test.beforeEach(() => clearGeocodingCache());

test('falls back to Nominatim when reverse lookup through HeiGIT fails', async () => {
  const requestedUrls = [];
  const place = await reverseGeocode(
    8.7514,
    80.4971,
    fallbackOptions(async (url) => {
      const requestedUrl = new URL(url);
      requestedUrls.push(requestedUrl);
      if (requestedUrl.hostname === 'api.heigit.test') {
        return { ok: false, status: 503 };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          place_id: 42,
          lat: '8.7514',
          lon: '80.4971',
          display_name: 'Vavuniya Town, Northern Province, Sri Lanka',
          address: {
            town: 'Vavuniya Town',
            state: 'Northern Province',
            'ISO3166-2-lvl4': 'LK-4',
          },
        }),
      };
    })
  );

  assert.equal(place.displayName, 'Vavuniya Town');
  assert.equal(requestedUrls.length, 2);
  assert.equal(requestedUrls[0].pathname, '/pelias/v1/reverse');
  assert.equal(requestedUrls[1].hostname, 'nominatim.test');
  assert.equal(requestedUrls[1].pathname, '/reverse');
});

test('falls back to bounded Nominatim search when HeiGIT search fails', async () => {
  const requestedUrls = [];
  const places = await searchPlaces(
    'University of Vavuniya',
    fallbackOptions(async (url) => {
      const requestedUrl = new URL(url);
      requestedUrls.push(requestedUrl);
      if (requestedUrl.hostname === 'api.heigit.test') {
        return { ok: false, status: 403 };
      }
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            place_id: 84,
            lat: '8.75865',
            lon: '80.41081',
            display_name:
              'University of Vavuniya, Pambaimadu, Northern Province, Sri Lanka',
            name: 'University of Vavuniya',
            address: {
              university: 'University of Vavuniya',
              village: 'Pambaimadu',
              state: 'Northern Province',
              'ISO3166-2-lvl4': 'LK-4',
            },
          },
        ],
      };
    })
  );

  assert.equal(places.length, 1);
  assert.equal(
    places[0].displayName,
    'University of Vavuniya, Pambaimadu'
  );
  assert.equal(requestedUrls.length, 2);
  assert.equal(requestedUrls[0].pathname, '/pelias/v1/autocomplete');
  assert.equal(requestedUrls[1].hostname, 'nominatim.test');
  assert.equal(requestedUrls[1].pathname, '/search');
  assert.equal(requestedUrls[1].searchParams.get('bounded'), '1');
  assert.equal(requestedUrls[1].searchParams.get('countrycodes'), 'lk');
});
