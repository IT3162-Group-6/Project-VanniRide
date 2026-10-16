import test from 'node:test';
import assert from 'node:assert/strict';
import { getLocationLabels } from '../src/utils/locationLabels.js';

test('uses service-specific location titles', () => {
  assert.deepEqual(getLocationLabels('transport'), {
    pickup: 'Pickup',
    destination: 'Destination',
  });
  assert.deepEqual(getLocationLabels('delivery', 'food'), {
    pickup: 'Food pickup location',
    destination: 'Food delivery location',
  });
  assert.deepEqual(getLocationLabels('delivery', 'water'), {
    pickup: 'Bottle collection & final drop-off',
    destination: 'Water filling source',
  });
  assert.deepEqual(getLocationLabels('delivery', 'parcel'), {
    pickup: 'Parcel collection point',
    destination: 'Parcel delivery point',
  });
});
