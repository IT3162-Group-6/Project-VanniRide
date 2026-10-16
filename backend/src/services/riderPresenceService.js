const Rider = require('../models/riderModel');

const RIDER_PRESENCE_TIMEOUT_MS = 90 * 1000;

const getRiderAvailabilitySummary = async (now = new Date()) => {
  const cutoff = new Date(now.getTime() - RIDER_PRESENCE_TIMEOUT_MS);
  const [summary = {}] = await Rider.aggregate([
    { $match: { approval_status: 'APPROVED' } },
    {
      $group: {
        _id: null,
        approved: { $sum: 1 },
        available: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$availability_status', 'AVAILABLE'] },
                  { $gte: ['$last_seen_at', cutoff] },
                ],
              },
              1,
              0,
            ],
          },
        },
        busy: {
          $sum: {
            $cond: [{ $eq: ['$availability_status', 'BUSY'] }, 1, 0],
          },
        },
      },
    },
  ]);

  const approved = summary.approved || 0;
  const available = summary.available || 0;
  const busy = summary.busy || 0;
  return {
    available,
    busy,
    offline: Math.max(approved - available - busy, 0),
    approved,
  };
};

module.exports = {
  RIDER_PRESENCE_TIMEOUT_MS,
  getRiderAvailabilitySummary,
};
