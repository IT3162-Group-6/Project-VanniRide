use("vanniRideDB");

function sameKey(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameOptions(existing, requested) {
  return (
    Boolean(existing.unique) === Boolean(requested.unique) &&
    Boolean(existing.sparse) === Boolean(requested.sparse) &&
    JSON.stringify(existing.partialFilterExpression || null) ===
      JSON.stringify(requested.partialFilterExpression || null)
  );
}

function assertNoDuplicates(collection, key, filter) {
  const groupId = {};
  Object.keys(key).forEach(function(field) {
    groupId[field.replaceAll(".", "_")] = "$" + field;
  });

  const pipeline = [];
  if (filter) pipeline.push({ $match: filter });
  pipeline.push(
    { $group: { _id: groupId, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 }
  );

  const duplicate = collection.aggregate(pipeline).toArray()[0];
  if (duplicate) {
    throw new Error(
      "Cannot create unique index on " +
        collection.getName() +
        " because duplicate data exists for " +
        JSON.stringify(duplicate._id)
    );
  }
}

function ensureIndex(collectionName, key, options) {
  const collection = db.getCollection(collectionName);
  const requested = options || {};
  const generatedName = Object.entries(key)
    .map(function(entry) { return entry[0] + "_" + entry[1]; })
    .join("_");
  const requestedName = requested.name || generatedName;
  const conflicting = collection.getIndexes().filter(function(index) {
    return index.name === requestedName || sameKey(index.key, key);
  });

  if (
    conflicting.length === 1 &&
    sameKey(conflicting[0].key, key) &&
    sameOptions(conflicting[0], requested)
  ) {
    return conflicting[0].name;
  }

  if (requested.unique) {
    assertNoDuplicates(collection, key, requested.partialFilterExpression);
  }

  conflicting.forEach(function(index) {
    if (index.name !== "_id_") {
      collection.dropIndex(index.name);
      print("Replaced legacy index " + collectionName + "." + index.name);
    }
  });

  return collection.createIndex(key, requested);
}

ensureIndex("users", { email: 1 }, { unique: true });

ensureIndex("riders", { user_id: 1 }, { unique: true });
db.riders.createIndex({ availability_status: 1 });
db.riders.createIndex({ approval_status: 1 });
ensureIndex(
  "riders",
  { "vehicle.registration_number": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "vehicle.registration_number": { $type: "string" }
    }
  }
);

db.rides.createIndex({ customer_id: 1, status: 1 });
ensureIndex(
  "rides",
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

ensureIndex("payments", { ride_id: 1 }, { unique: true });
db.payments.createIndex({ payment_status: 1 });
db.payments.createIndex({ confirmed_by: 1 });

db.messages.createIndex({ ride_id: 1, sent_at: 1 });
db.messages.createIndex({ sender_id: 1 });

ensureIndex("cancellations", { ride_id: 1 }, { unique: true });
db.cancellations.createIndex({ cancelled_by: 1, cancelled_at: 1 });

ensureIndex(
  "cancellation_requests",
  { ride_id: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } }
);
db.cancellation_requests.createIndex({ status: 1, expires_at: 1 });
db.cancellation_requests.createIndex({ responding_user_id: 1, status: 1 });
db.cancellation_requests.createIndex({ requested_by: 1, status: 1 });

ensureIndex("ratings", { ride_id: 1 }, { unique: true });
db.ratings.createIndex({ rider_id: 1, created_at: -1 });
db.ratings.createIndex({ customer_id: 1 });

db.chat_access_requests.createIndex({ status: 1, requested_at: 1 });
db.chat_access_requests.createIndex({ ride_id: 1, approved_until: 1 });
ensureIndex(
  "chat_access_requests",
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
