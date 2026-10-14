import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOOD_PICKUP_LOCATIONS,
  WATER_PICKUP_LOCATIONS,
  buildDeliveryPayload,
  createDefaultDeliveryDetails,
  validateDeliveryDetails,
} from '../src/data/deliveryOptions.js';

test('offers every approved food pickup quick pick', () => {
  assert.deepEqual(
    FOOD_PICKUP_LOCATIONS.map((place) => place.displayName),
    [
      'Hostel Canteen',
      'Rilvan Restaurant',
      'RS Restaurant',
      'Army Camp Canteen',
      'Applied Canteen',
      'Business Studies Canteen',
    ]
  );
  assert.deepEqual(
    FOOD_PICKUP_LOCATIONS.map(({ latitude, longitude }) => [latitude, longitude]),
    [
      [8.754679431136763, 80.39997959306534],
      [8.755848949069371, 80.3917985440667],
      [8.758562832226218, 80.40602169348837],
      [8.75972707146535, 80.42144188915817],
      [8.755239886779476, 80.41010048481681],
      [8.756951361634316, 80.41078483844242],
    ]
  );
});

test('offers the approved drinking-water outlets as water quick picks', () => {
  assert.deepEqual(
    WATER_PICKUP_LOCATIONS,
    [
      { id: 'girls-hostel-water', displayName: 'Girls Hostel Water Outlet', latitude: 8.755949051450258, longitude: 80.39949256607096 },
      { id: 'bs-canteen-water', displayName: 'BS Canteen Water Outlet', latitude: 8.756834249378084, longitude: 80.41077647382527 },
    ]
  );
});

test('validates delivery fields and builds only the selected category payload', () => {
  const details = createDefaultDeliveryDetails();
  assert.equal(validateDeliveryDetails(details, 'FOOD'), 'Choose or enter the food pickup location.');

  details.foodOrder.outletCode = 'hostel-canteen';
  details.foodOrder.outletName = 'Hostel Canteen';
  details.foodOrder.items[0].quantity = 2;

  assert.equal(validateDeliveryDetails(details, 'FOOD'), '');
  assert.deepEqual(buildDeliveryPayload(details, 'FOOD'), {
    foodOrder: details.foodOrder,
  });

  assert.equal(validateDeliveryDetails(details, 'PARCEL'), '');
  assert.deepEqual(buildDeliveryPayload(details, 'PARCEL'), {
    receiverMode: 'SELF',
    parcelOrder: details.parcelOrder,
  });
  details.receiverMode = 'OTHER';
  assert.equal(validateDeliveryDetails(details, 'PARCEL'), 'Enter the receiver name.');
  details.receiverName = 'Parcel Receiver';
  details.receiverPhone = '077 123 4567';
  assert.equal(validateDeliveryDetails(details, 'PARCEL'), '');
  assert.deepEqual(buildDeliveryPayload(details, 'PARCEL'), {
    receiverMode: 'OTHER',
    receiverName: 'Parcel Receiver',
    receiverPhone: '0771234567',
    parcelOrder: details.parcelOrder,
  });
});
