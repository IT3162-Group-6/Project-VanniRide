use("vanniRideDB");

const collections = [
  "users",
  "riders",
  "rides",
  "payments",
  "messages",
  "cancellations",
  "cancellation_requests",
  "ratings",
  "chat_access_requests"
];

collections.forEach(function(collectionName) {
  const exists = db.getCollectionNames().includes(collectionName);

  if (!exists) {
    db.createCollection(collectionName);
    print(collectionName + " collection created");
  } else {
    print(collectionName + " collection already exists");
  }
});
