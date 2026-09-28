use("vanniRideDB");

// USERS
db.users.createIndex(
  { email: 1 },
  { unique: true }
);

// RIDERS
db.riders.createIndex(
  { user_id: 1 },
  { unique: true }
);

// RIDES
db.rides.createIndex(
  { customer_id: 1, status: 1 }
);

db.rides.createIndex(
  { rider_id: 1, status: 1 }
);

db.rides.createIndex(
  { status: 1 }
);

// PAYMENTS
db.payments.createIndex(
  { ride_id: 1 },
  { unique: true }
);

db.payments.createIndex(
  { payment_status: 1 }
);

db.payments.createIndex(
  { confirmed_by: 1 }
);

// MESSAGES
db.messages.createIndex(
  { ride_id: 1, created_at: 1 }
);

db.messages.createIndex(
  { sender_id: 1 }
);

// CANCELLATIONS
db.cancellations.createIndex(
  { ride_id: 1 },
  { unique: true }
);

db.cancellations.createIndex(
  { cancelled_by: 1, cancelled_at: 1 }
);

// RATINGS
db.ratings.createIndex(
  { ride_id: 1 },
  { unique: true }
);

db.ratings.createIndex(
  { rider_id: 1, created_at: -1 }
);

db.ratings.createIndex(
  { customer_id: 1 }
);

print("All VanniRide indexes created successfully.");