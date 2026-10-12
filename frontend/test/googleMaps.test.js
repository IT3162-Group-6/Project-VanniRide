import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleMapsNavigationUrl,
  riderNavigation,
} from '../src/utils/googleMaps.js';

test('builds Google Maps navigation links from stored coordinates', () => {
  const url = new URL(buildGoogleMapsNavigationUrl({
    address: 'University of Vavuniya',
    latitude: 8.7581,
    longitude: 80.4982,
  }));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('destination'), '8.7581,80.4982');
  assert.equal(url.searchParams.get('travelmode'), 'driving');
  assert.equal(url.searchParams.get('dir_action'), 'navigate');
});

test('sends an accepted rider to pickup, then to the destination', () => {
  const ride = {
    apiStatus: 'ACCEPTED',
    pickupLocation: { latitude: 8.75, longitude: 80.49 },
    destination: { latitude: 8.76, longitude: 80.5 },
  };
  assert.equal(riderNavigation(ride).label, 'Navigate to pickup');
  assert.match(riderNavigation(ride).url, /destination=8.75%2C80.49/);

  ride.apiStatus = 'STARTED';
  assert.equal(riderNavigation(ride).label, 'Navigate to destination');
  assert.match(riderNavigation(ride).url, /destination=8.76%2C80.5/);

  ride.apiStatus = 'COMPLETED';
  assert.equal(riderNavigation(ride), null);
});

test('falls back to a stored address when coordinates are unavailable', () => {
  const url = new URL(buildGoogleMapsNavigationUrl('Vavuniya Bus Stand'));
  assert.equal(url.searchParams.get('destination'), 'Vavuniya Bus Stand');
  assert.equal(buildGoogleMapsNavigationUrl(null), null);
});
