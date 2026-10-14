const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeDeliveryDetails } = require('../src/utils/deliveryDetails');

const parcelOrder = {
  parcelType: 'DOCUMENTS',
  weightKg: 1,
  notes: '',
};

test('uses the authenticated customer details for a self-received parcel', () => {
  const details = normalizeDeliveryDetails(
    { receiverMode: 'SELF', parcelOrder },
    'PARCEL',
    { name: 'Customer Name', phone: '077 123 4567' }
  );

  assert.equal(details.receiver_name, 'Customer Name');
  assert.equal(details.receiver_phone, '0771234567');
});

test('requires explicit receiver details for another-person parcels', () => {
  assert.throws(
    () => normalizeDeliveryDetails(
      { receiverMode: 'OTHER', parcelOrder },
      'PARCEL',
      { name: 'Customer Name', phone: '0771234567' }
    ),
    /Receiver name is required/
  );

  const details = normalizeDeliveryDetails({
    receiverMode: 'OTHER',
    receiverName: 'Other Receiver',
    receiverPhone: '071 234 5678',
    parcelOrder,
  }, 'PARCEL');
  assert.equal(details.receiver_name, 'Other Receiver');
  assert.equal(details.receiver_phone, '0712345678');
});
