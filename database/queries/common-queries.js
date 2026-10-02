use("vanniRideDB");

// Helper function to print query results
function printResults(cursor) {
  const results = cursor.toArray();

  if (results.length === 0) {
    print("No records found.");
  } else {
    results.forEach(function(doc) {
      printjson(doc);
    });
  }
}


// Find sample users without hard-coded ObjectIds
const sampleCustomer = db.users.findOne({
  email: "customer@test.com"
});

const sampleRider = db.users.findOne({
  email: "rider@test.com"
});

const sampleCustomerId = sampleCustomer ? sampleCustomer._id : null;
const sampleRiderId = sampleRider ? sampleRider._id : null;


// 1. AVAILABLE RIDERS
print("\n--- Available Riders ---");

printResults(
  db.riders.find({
    availability_status: "AVAILABLE",
    approval_status: "APPROVED"
  })
);


// 2. RIDERS AWAITING ADMIN APPROVAL
print("\n--- Pending Rider Approvals ---");

printResults(
  db.riders.find({
    approval_status: "PENDING"
  })
);


// 3. REQUESTED RIDES
print("\n--- Requested Rides ---");

printResults(
  db.rides.find({
    status: "REQUESTED"
  })
);


// 4. ACTIVE RIDES FOR SAMPLE CUSTOMER
print("\n--- Active Customer Rides ---");

if (sampleCustomerId) {
  printResults(
    db.rides.find({
      customer_id: sampleCustomerId,
      status: {
        $in: ["REQUESTED", "ACCEPTED", "ARRIVED", "STARTED"]
      }
    })
  );
} else {
  print("Sample customer not found.");
}


// 5. RIDES ASSIGNED TO SAMPLE RIDER
print("\n--- Rider Assigned Rides ---");

if (sampleRiderId) {
  printResults(
    db.rides.find({
      rider_id: sampleRiderId
    })
  );
} else {
  print("Sample rider not found.");
}


// 6. COMPLETED RIDES
print("\n--- Completed Rides ---");

printResults(
  db.rides.find({
    status: "COMPLETED"
  })
);


// 7. PENDING PAYMENTS
print("\n--- Pending Payments ---");

printResults(
  db.payments.find({
    payment_status: "PENDING"
  })
);


// Find a completed ride belonging to the sample customer
let sampleRide = null;

if (sampleCustomerId) {
  const completedRideArray = db.rides
    .find({
      customer_id: sampleCustomerId,
      status: "COMPLETED"
    })
    .sort({
      requested_at: -1
    })
    .limit(1)
    .toArray();

  if (completedRideArray.length > 0) {
    sampleRide = completedRideArray[0];
  }
}


// 8. MESSAGES FOR SAMPLE RIDE
print("\n--- Ride Messages ---");

if (sampleRide) {
  printResults(
    db.messages
      .find({
        ride_id: sampleRide._id
      })
      .sort({
        sent_at: 1
      })
  );
} else {
  print("Sample ride not found.");
}


// 9. CANCELLATION COUNT DURING THE ROLLING 60-MINUTE WINDOW
print("\n--- Rolling 60-Minute Cancellation Count ---");

if (sampleCustomerId) {
  const cancellationCount = db.cancellations.countDocuments({
    cancelled_by: sampleCustomerId,
    cancelled_at: {
      $gte: new Date(
        Date.now() - 60 * 60 * 1000
      )
    }
  });

  print(cancellationCount);
} else {
  print("Sample customer not found.");
}


// 10. RATINGS FOR SAMPLE RIDER
print("\n--- Rider Ratings ---");

if (sampleRiderId) {
  printResults(
    db.ratings
      .find({
        rider_id: sampleRiderId
      })
      .sort({
        created_at: -1
      })
  );
} else {
  print("Sample rider not found.");
}


// 11. RIDES WITH CUSTOMER DETAILS
print("\n--- Rides With Customer Details ---");

printResults(
  db.rides.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "customer_id",
        foreignField: "_id",
        as: "customer_details"
      }
    }
  ])
);


// 12. RIDES WITH RIDER DETAILS
print("\n--- Rides With Rider Details ---");

printResults(
  db.rides.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "rider_id",
        foreignField: "_id",
        as: "rider_details"
      }
    }
  ])
);


print("\nVanniRide common database queries executed successfully.");
