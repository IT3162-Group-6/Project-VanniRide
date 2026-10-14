import assert from 'node:assert/strict';
import test from 'node:test';

import { findRatingPromptRide } from '../src/utils/ratingPrompt.js';

const completedRide = (id, overrides = {}) => ({
  id,
  status: 'completed',
  rider: { id: 'rider-1', name: 'Rider' },
  rating: null,
  ...overrides,
});

test('finds an unrated completed ride and honors the preferred completion event', () => {
  const rides = [completedRide('older'), completedRide('newer')];
  assert.equal(findRatingPromptRide(rides, [], 'newer').id, 'newer');
});

test('does not prompt for rated, active, or previously skipped rides', () => {
  const rides = [
    completedRide('rated', { rating: { rating: 5 } }),
    completedRide('active', { status: 'picked' }),
    completedRide('skipped'),
  ];
  assert.equal(findRatingPromptRide(rides, ['skipped']), null);
});
