use("vanniRideDB");

const numericTypes = ["double", "int", "long", "decimal"];

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
        "token_version",
        "created_at",
        "updated_at"
      ],
      properties: {
        name: { bsonType: "string", minLength: 1 },
        email: { bsonType: "string", minLength: 3 },
        phone: { bsonType: "string", minLength: 1 },
        password_hash: { bsonType: "string", minLength: 1 },
        role: { enum: ["CUSTOMER", "RIDER", "ADMIN"] },
        account_status: { enum: ["ACTIVE", "SUSPENDED"] },
        token_version: { bsonType: numericTypes, minimum: 0 },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.runCommand({
  collMod: "riders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "availability_status", "created_at", "updated_at"],
      properties: {
        user_id: { bsonType: "objectId" },
        availability_status: { enum: ["AVAILABLE", "UNAVAILABLE", "BUSY"] },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.runCommand({
  collMod: "rides",
  validator: {
    $and: [
      {
        $jsonSchema: {
          bsonType: "object",
          required: [
            "customer_id",
            "rider_id",
            "request_type",
            "delivery_category",
            "pickup_location",
            "destination",
            "distance_km",
            "fare_amount",
            "status",
            "requested_at"
          ],
          properties: {
            customer_id: { bsonType: "objectId" },
            rider_id: { bsonType: ["objectId", "null"] },
            request_type: { enum: ["TRANSPORT", "DELIVERY"] },
            delivery_category: { enum: ["FOOD", "WATER", "PARCEL", null] },
            pickup_location: {
              bsonType: "object",
              required: ["address", "latitude", "longitude"],
              properties: {
                address: { bsonType: "string", minLength: 1 },
                latitude: { bsonType: numericTypes, minimum: -90, maximum: 90 },
                longitude: { bsonType: numericTypes, minimum: -180, maximum: 180 }
              }
            },
            destination: {
              bsonType: "object",
              required: ["address", "latitude", "longitude"],
              properties: {
                address: { bsonType: "string", minLength: 1 },
                latitude: { bsonType: numericTypes, minimum: -90, maximum: 90 },
                longitude: { bsonType: numericTypes, minimum: -180, maximum: 180 }
              }
            },
            distance_km: { bsonType: numericTypes, minimum: 0 },
            fare_amount: { bsonType: numericTypes, minimum: 0 },
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
            requested_at: { bsonType: "date" },
            accepted_at: { bsonType: ["date", "null"] },
            arrived_at: { bsonType: ["date", "null"] },
            started_at: { bsonType: ["date", "null"] },
            completed_at: { bsonType: ["date", "null"] },
            cancelled_at: { bsonType: ["date", "null"] }
          }
        }
      },
      {
        $or: [
          { request_type: "TRANSPORT", delivery_category: null },
          {
            request_type: "DELIVERY",
            delivery_category: { $in: ["FOOD", "WATER", "PARCEL"] }
          }
        ]
      }
    ]
  },
  validationLevel: "strict",
  validationAction: "error"
});

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
        "confirmed_by",
        "created_at",
        "paid_at"
      ],
      properties: {
        ride_id: { bsonType: "objectId" },
        amount: { bsonType: numericTypes, minimum: 0 },
        payment_method: { enum: ["CASH"] },
        payment_status: { enum: ["PENDING", "PAID"] },
        confirmed_by: { bsonType: ["objectId", "null"] },
        created_at: { bsonType: "date" },
        paid_at: { bsonType: ["date", "null"] }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.runCommand({
  collMod: "messages",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["ride_id", "sender_id", "message_text", "sent_at"],
      properties: {
        ride_id: { bsonType: "objectId" },
        sender_id: { bsonType: "objectId" },
        message_text: { bsonType: "string", minLength: 1, maxLength: 1000 },
        sent_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.runCommand({
  collMod: "cancellations",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "ride_id",
        "cancelled_by",
        "reason",
        "previous_status",
        "cancellation_mode",
        "cancelled_at"
      ],
      properties: {
        ride_id: { bsonType: "objectId" },
        cancelled_by: { bsonType: "objectId" },
        reason: { bsonType: "string", minLength: 1, maxLength: 500 },
        previous_status: { enum: ["REQUESTED", "ACCEPTED", "STARTED"] },
        cancellation_mode: { enum: ["IMMEDIATE", "MUTUAL", "AUTO_TIMEOUT"] },
        cancelled_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.runCommand({
  collMod: "cancellation_requests",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "ride_id",
        "requested_by",
        "responding_user_id",
        "reason",
        "status",
        "requested_at",
        "expires_at",
        "responded_at",
        "resolved_at"
      ],
      properties: {
        ride_id: { bsonType: "objectId" },
        requested_by: { bsonType: "objectId" },
        responding_user_id: { bsonType: "objectId" },
        reason: { bsonType: "string", minLength: 1, maxLength: 500 },
        status: { enum: ["PENDING", "CONFIRMED", "RESUMED", "AUTO_CANCELLED"] },
        requested_at: { bsonType: "date" },
        expires_at: { bsonType: "date" },
        responded_at: { bsonType: ["date", "null"] },
        resolved_at: { bsonType: ["date", "null"] }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.runCommand({
  collMod: "ratings",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["ride_id", "customer_id", "rider_id", "rating", "review", "created_at"],
      properties: {
        ride_id: { bsonType: "objectId" },
        customer_id: { bsonType: "objectId" },
        rider_id: { bsonType: "objectId" },
        rating: { bsonType: numericTypes, minimum: 1, maximum: 5 },
        review: { bsonType: ["string", "null"], maxLength: 1000 },
        created_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.runCommand({
  collMod: "chat_access_requests",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "ride_id",
        "requested_by",
        "rider_id",
        "reason",
        "status",
        "reviewed_by",
        "requested_at",
        "reviewed_at",
        "approved_from",
        "approved_until"
      ],
      properties: {
        ride_id: { bsonType: "objectId" },
        requested_by: { bsonType: "objectId" },
        rider_id: { bsonType: "objectId" },
        reason: { bsonType: "string", minLength: 1, maxLength: 500 },
        status: { enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED"] },
        reviewed_by: { bsonType: ["objectId", "null"] },
        requested_at: { bsonType: "date" },
        reviewed_at: { bsonType: ["date", "null"] },
        approved_from: { bsonType: ["date", "null"] },
        approved_until: { bsonType: ["date", "null"] }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.runCommand({
  collMod: "admin_audit_logs",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "admin_id",
        "action",
        "target_type",
        "target_id",
        "reason",
        "before",
        "after",
        "created_at"
      ],
      properties: {
        admin_id: { bsonType: "objectId" },
        action: {
          enum: [
            "USER_STATUS_CHANGED",
            "PAYMENT_CORRECTED",
            "CHAT_ACCESS_REVIEWED"
          ]
        },
        target_type: {
          enum: ["USER", "PAYMENT", "CHAT_ACCESS_REQUEST"]
        },
        target_id: { bsonType: "objectId" },
        reason: { bsonType: "string", minLength: 1, maxLength: 500 },
        before: { bsonType: "object" },
        after: { bsonType: "object" },
        created_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

print("All Vanni Ride validators applied successfully.");
