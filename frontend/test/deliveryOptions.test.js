import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOOD_PICKUP_LOCATIONS,
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
});

test('validates delivery fields and builds only the selected category payload', () => {
  const details = createDefaultDeliveryDetails();
  assert.equal(validateDeliveryDetails(details, 'FOOD'), 'Enter the receiver name.');

  details.receiverName = 'Student Receiver';
  details.receiverPhone = '077 123 4567';
  details.foodOrder.outletCode = 'hostel-canteen';
  details.foodOrder.outletName = 'Hostel Canteen';
  details.foodOrder.items[0].quantity = 2;

  assert.equal(validateDeliveryDetails(details, 'FOOD'), '');
  assert.deepEqual(buildDeliveryPayload(details, 'FOOD'), {
    receiverName: 'Student Receiver',
    receiverPhone: '0771234567',
    foodOrder: details.foodOrder,
  });
});
