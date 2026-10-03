use("vanniRideDB");

// Password for local team testing only: VanniRideDemo123!
// This is a real bcrypt hash so the seeded accounts can use the login API.
const demoPasswordHash =
  "$2b$12$AanNYPoHFHij7L6.KiEI5ubaRILAr6.tlywjFEba3yULIbpecp8Qq";

// Prevent duplicate seed data
if (db.users.findOne({ email: "customer@test.com" })) {
  db.users.updateMany(
    { email: { $in: ["customer@test.com", "rider@test.com", "admin@test.com"] } },
    {
      $set: {
        password_hash: demoPasswordHash,
        account_status: "ACTIVE",
        updated_at: new Date()
      }
    }
  );
  print("Existing demo account passwords and statuses were refreshed.");
} else {

  // CUSTOMER
  const customerResult = db.users.insertOne({
    name: "Test Customer",
    email: "customer@test.com",
    phone: "0771234567",
    password_hash: demoPasswordHash,
    role: "CUSTOMER",
    account_status: "ACTIVE",
    token_version: 0,
    created_at: new Date(),
    updated_at: new Date()
  });

  const customerId = customerResult.insertedId;

  // ADMIN USER
  const adminResult = db.users.insertOne({
    name: "Test Admin",
    email: "admin@test.com",
    phone: "0700000000",
    password_hash: demoPasswordHash,
    role: "ADMIN",
    account_status: "ACTIVE",
    token_version: 0,
    created_at: new Date(),
    updated_at: new Date()
  });

  const adminId = adminResult.insertedId;

  // RIDER USER
  const riderUserResult = db.users.insertOne({
    name: "Test Rider",
    email: "rider@test.com",
    phone: "0777654321",
    password_hash: demoPasswordHash,
    role: "RIDER",
    account_status: "ACTIVE",
    token_version: 0,
    created_at: new Date(),
    updated_at: new Date()
  });

  const riderUserId = riderUserResult.insertedId;

  // RIDER PROFILE
  db.riders.insertOne({
    user_id: riderUserId,
    availability_status: "AVAILABLE",
    vehicle: {
      type: "Motorcycle",
      model: "Honda Dio",
      registration_number: "NP-TEST-1001",
      color: "Black"
    },
    approval_status: "APPROVED",
    review_reason: "Approved sample rider",
    reviewed_by: adminId,
    reviewed_at: new Date(),
    created_at: new Date(),
    updated_at: new Date()
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

    requested_at: new Date(),
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
    message_text: "I am near the university gate.",
    sent_at: new Date()
  });

  // RIDER MESSAGE
  db.messages.insertOne({
    ride_id: rideId,
    sender_id: riderUserId,
    message_text: "Okay, I am coming to the gate now.",
    sent_at: new Date()
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

print("Demo login: customer@test.com / VanniRideDemo123!");
print("Demo login: rider@test.com / VanniRideDemo123!");
print("Demo login: admin@test.com / VanniRideDemo123!");
