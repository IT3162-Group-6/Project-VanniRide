use("vanniRideDB");

// USERS
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "name",
        "email",
        "phone",
        "password_hash",
        "role",
        "account_status",
        "created_at"
      ],
      properties: {
        name: {
          bsonType: "string",
          minLength: 1
        },
        email: {
          bsonType: "string",
          minLength: 1
        },
        phone: {
          bsonType: "string",
          minLength: 1
        },
        password_hash: {
          bsonType: "string",
          minLength: 1
        },
        role: {
          enum: ["CUSTOMER", "RIDER", "ADMIN"]
        },
        account_status: {
          enum: ["ACTIVE", "SUSPENDED"]
        },
        created_at: {
          bsonType: "date"
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// RIDERS
db.runCommand({
  collMod: "riders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "user_id",
        "availability_status"
      ],
      properties: {
        user_id: {
          bsonType: "objectId"
        },
        availability_status: {
          enum: ["AVAILABLE", "UNAVAILABLE", "BUSY"]
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// RIDES
db.runCommand({
  collMod: "rides",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "customer_id",
        "request_type",
        "pickup_location",
        "destination",
        "distance_km",
        "fare_amount",
        "status",
        "created_at"
      ],
      properties: {
        customer_id: {
          bsonType: "objectId"
        },
        rider_id: {
          bsonType: ["objectId", "null"]
        },
        request_type: {
          enum: ["TRANSPORT", "DELIVERY"]
        },
        delivery_category: {
          enum: ["FOOD", "WATER", "PARCEL", null]
        },
        pickup_location: {
          bsonType: "object",
          required: ["address", "latitude", "longitude"],
          properties: {
            address: {
              bsonType: "string"
            },
            latitude: {
              bsonType: ["double", "int", "long", "decimal"]
            },
            longitude: {
              bsonType: ["double", "int", "long", "decimal"]
            }
          }
        },
        destination: {
          bsonType: "object",
          required: ["address", "latitude", "longitude"],
          properties: {
            address: {
              bsonType: "string"
            },
            latitude: {
              bsonType: ["double", "int", "long", "decimal"]
            },
            longitude: {
              bsonType: ["double", "int", "long", "decimal"]
            }
          }
        },
        distance_km: {
          bsonType: ["double", "int", "long", "decimal"],
          minimum: 0
        },
        fare_amount: {
          bsonType: ["double", "int", "long", "decimal"],
          minimum: 0
        },
        status: {
          enum: [
            "REQUESTED",
            "ACCEPTED",
            "ARRIVED",
            "STARTED",
            "COMPLETED",
            "CANCELLED"
          ]
        },
        created_at: {
          bsonType: "date"
        },
        accepted_at: {
          bsonType: ["date", "null"]
        },
        arrived_at: {
          bsonType: ["date", "null"]
        },
        started_at: {
          bsonType: ["date", "null"]
        },
        completed_at: {
          bsonType: ["date", "null"]
        },
        cancelled_at: {
          bsonType: ["date", "null"]
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// PAYMENTS
db.runCommand({
  collMod: "payments",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "ride_id",
        "amount",
        "payment_method",
        "payment_status",
        "created_at"
      ],
      properties: {
        ride_id: {
          bsonType: "objectId"
        },
        amount: {
          bsonType: ["double", "int", "long", "decimal"],
          minimum: 0
        },
        payment_method: {
          enum: ["CASH"]
        },
        payment_status: {
          enum: ["PENDING", "PAID"]
        },
        confirmed_by: {
          bsonType: ["objectId", "null"]
        },
        created_at: {
          bsonType: "date"
        },
        paid_at: {
          bsonType: ["date", "null"]
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// MESSAGES
db.runCommand({
  collMod: "messages",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "ride_id",
        "sender_id",
        "message",
        "created_at"
      ],
      properties: {
        ride_id: {
          bsonType: "objectId"
        },
        sender_id: {
          bsonType: "objectId"
        },
        message: {
          bsonType: "string",
          minLength: 1
        },
        created_at: {
          bsonType: "date"
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// CANCELLATIONS
db.runCommand({
  collMod: "cancellations",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "ride_id",
        "cancelled_by",
        "reason",
        "cancelled_at"
      ],
      properties: {
        ride_id: {
          bsonType: "objectId"
        },
        cancelled_by: {
          bsonType: "objectId"
        },
        reason: {
          bsonType: "string",
          minLength: 1
        },
        cancelled_at: {
          bsonType: "date"
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// RATINGS
db.runCommand({
  collMod: "ratings",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "ride_id",
        "customer_id",
        "rider_id",
        "rating",
        "created_at"
      ],
      properties: {
        ride_id: {
          bsonType: "objectId"
        },
        customer_id: {
          bsonType: "objectId"
        },
        rider_id: {
          bsonType: "objectId"
        },
        rating: {
          bsonType: ["int", "long", "double", "decimal"],
          minimum: 1,
          maximum: 5
        },
        review: {
          bsonType: ["string", "null"]
        },
        created_at: {
          bsonType: "date"
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

print("All VanniRide validators applied successfully.");