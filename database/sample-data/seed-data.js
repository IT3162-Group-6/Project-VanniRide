use("vanniRideDB");

// Prevent duplicate seed data
if (db.users.findOne({ email: "customer@test.com" })) {
  print("Seed data already exists. No new sample data inserted.");
} else {

  // CUSTOMER
  const customerResult = db.users.insertOne({
    name: "Test Customer",
    email: "customer@test.com",
    phone: "0771234567",
    password_hash: "TEMP_PASSWORD",
    role: "CUSTOMER",
    account_status: "ACTIVE",
    created_at: new Date()
  });

  const customerId = customerResult.insertedId;

  // RIDER USER
  const riderUserResult = db.users.insertOne({
    name: "Test Rider",
    email: "rider@test.com",
    phone: "0777654321",
    password_hash: "TEMP_PASSWORD",
    role: "RIDER",
    account_status: "ACTIVE",
    created_at: new Date()
  });

  const riderUserId = riderUserResult.insertedId;

  // RIDER PROFILE
  db.riders.insertOne({
    user_id: riderUserId,
    availability_status: "AVAILABLE"
  });

  // COMPLETED RIDE
  const rideResult = db.rides.insertOne({
    customer_id: customerId,
    rider_id: riderUserId,

    request_type: "TRANSPORT",
    delivery_category: null,

    pickup_location: {
      address: "University of Vavuniya",
      latitude: 8.759,
      longitude: 80.497
    },

    destination: {
      address: "Vavuniya Town",
      latitude: 8.754,
      longitude: 80.498
    },

    distance_km: 5.2,
    fare_amount: 350,

    status: "COMPLETED",

    created_at: new Date(),
    accepted_at: new Date(),
    arrived_at: new Date(),
    started_at: new Date(),
    completed_at: new Date(),
    cancelled_at: null
  });

  const rideId = rideResult.insertedId;

  // PAYMENT
  db.payments.insertOne({
    ride_id: rideId,
    amount: 350,
    payment_method: "CASH",
    payment_status: "PAID",
    confirmed_by: riderUserId,
    created_at: new Date(),
    paid_at: new Date()
  });

  // CUSTOMER MESSAGE
  db.messages.insertOne({
    ride_id: rideId,
    sender_id: customerId,
    message: "I am near the university gate.",
    created_at: new Date()
  });

  // RIDER MESSAGE
  db.messages.insertOne({
    ride_id: rideId,
    sender_id: riderUserId,
    message: "Okay, I am coming to the gate now.",
    created_at: new Date()
  });

  // RATING
  db.ratings.insertOne({
    ride_id: rideId,
    customer_id: customerId,
    rider_id: riderUserId,
    rating: 5,
    review: "Good service",
    created_at: new Date()
  });

  print("VanniRide sample data inserted successfully.");
}