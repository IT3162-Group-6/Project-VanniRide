use("vanniRideDB");

// Run before validators.js when upgrading a database that already contains
// rider profiles. Legacy riders must submit vehicle information and receive
// approval before they can become available again.
const result = db.riders.updateMany(
  {
    $or: [
      { approval_status: { $exists: false } },
      { review_reason: { $exists: false } },
      { reviewed_by: { $exists: false } },
      { reviewed_at: { $exists: false } }
    ]
  },
  {
    $set: {
      availability_status: "UNAVAILABLE",
      approval_status: "PENDING",
      review_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      updated_at: new Date()
    }
  }
);

print(
  "Legacy rider approval migration complete. Matched " +
    result.matchedCount +
    ", modified " +
    result.modifiedCount +
    "."
);

const missingVehicleCount = db.riders.countDocuments({
  $or: [
    { vehicle: { $exists: false } },
    { "vehicle.type": { $exists: false } },
    { "vehicle.model": { $exists: false } },
    { "vehicle.registration_number": { $exists: false } },
    { "vehicle.color": { $exists: false } }
  ]
});

if (missingVehicleCount > 0) {
  print(
    missingVehicleCount +
      " legacy rider profile(s) still require vehicle information through " +
      "the rider profile workflow before approval."
  );
}
