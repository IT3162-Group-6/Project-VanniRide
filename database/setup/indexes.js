use("vanniRideDB");

db.users.createIndex({ email: 1 }, { unique: true });

db.riders.createIndex({ user_id: 1 }, { unique: true });
db.riders.createIndex({ availability_status: 1 });

db.rides.createIndex({ customer_id: 1, status: 1 });
db.rides.createIndex(
  { customer_id: 1, request_type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["REQUESTED", "ACCEPTED", "ARRIVED", "STARTED"] }
    }
  }
);
db.rides.createIndex({ rider_id: 1, status: 1 });
db.rides.createIndex({ status: 1, requested_at: 1 });

db.payments.createIndex({ ride_id: 1 }, { unique: true });
db.payments.createIndex({ payment_status: 1 });
db.payments.createIndex({ confirmed_by: 1 });

db.messages.createIndex({ ride_id: 1, sent_at: 1 });
db.messages.createIndex({ sender_id: 1 });

db.cancellations.createIndex({ ride_id: 1 }, { unique: true });
db.cancellations.createIndex({ cancelled_by: 1, cancelled_at: 1 });

db.cancellation_requests.createIndex(
  { ride_id: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } }
);
db.cancellation_requests.createIndex({ status: 1, expires_at: 1 });
db.cancellation_requests.createIndex({ responding_user_id: 1, status: 1 });
db.cancellation_requests.createIndex({ requested_by: 1, status: 1 });

db.ratings.createIndex({ ride_id: 1 }, { unique: true });
db.ratings.createIndex({ rider_id: 1, created_at: -1 });
db.ratings.createIndex({ customer_id: 1 });

db.chat_access_requests.createIndex({ status: 1, requested_at: 1 });
db.chat_access_requests.createIndex({ ride_id: 1, approved_until: 1 });
db.chat_access_requests.createIndex(
  { ride_id: 1, requested_by: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } }
);

db.admin_audit_logs.createIndex({ admin_id: 1, created_at: -1 });
db.admin_audit_logs.createIndex({
  target_type: 1,
  target_id: 1,
  created_at: -1
});

print("All Vanni Ride indexes created successfully.");
