const assert = require('node:assert/strict');
const test = require('node:test');

const { getChatAccessParties } = require('../src/services/chatService');

const ride = {
  customer_id: { toString: () => 'customer-1' },
  rider_id: { toString: () => 'rider-1' },
};

test('identifies customer-initiated post-completion chat access', () => {
  assert.deepEqual(getChatAccessParties(ride, 'customer-1'), {
    requesterId: 'customer-1',
    requesterRole: 'CUSTOMER',
    counterpartId: 'rider-1',
    counterpartRole: 'RIDER',
  });
});

test('identifies rider-initiated post-completion chat access', () => {
  assert.deepEqual(getChatAccessParties(ride, 'rider-1'), {
    requesterId: 'rider-1',
    requesterRole: 'RIDER',
    counterpartId: 'customer-1',
    counterpartRole: 'CUSTOMER',
  });
});

test('rejects a requester who did not participate in the ride', () => {
  assert.throws(
    () => getChatAccessParties(ride, 'someone-else'),
    /not a ride participant/
  );
});
