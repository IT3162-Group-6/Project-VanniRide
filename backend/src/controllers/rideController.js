const AppError = require('../utils/appError');
const { calculateFare } = require('../utils/fareCalculator');

// Mock Ride model reference (adjust once the Database team shares the exact model)
// const Ride = require('../models/Ride'); 
// const User = require('../models/User');

// 1. Customer creates a ride request
exports.requestRide = async (req, res, next) => {
  try {
    const { pickupLocation, dropoffLocation, rideType, distanceKm } = req.body;

    // Basic validation
    if (!pickupLocation || !dropoffLocation || !rideType) {
      return next(new AppError('Pickup, dropoff, and ride type are required', 400));
    }

    const estimatedFare = calculateFare(rideType, distanceKm);

    // Create the ride record in DB
    /* 
    const newRide = await Ride.create({
      customerId: req.user._id, // Set by Member 1's auth middleware
      pickupLocation,
      dropoffLocation,
      rideType,
      fare: estimatedFare,
      status: 'REQUESTED',
      paymentStatus: 'PENDING'
    });
    */

    // Consistent response format standard
    res.status(201).json({
      success: true,
      message: 'Ride requested successfully',
      data: {
        pickupLocation,
        dropoffLocation,
        rideType,
        fare: estimatedFare,
        status: 'REQUESTED'
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. Rider views all pending requests
exports.getAvailableRides = async (req, res, next) => {
  try {
    // Find all rides that need a driver
    // const rides = await Ride.find({ status: 'REQUESTED' });

    res.status(200).json({
      success: true,
      data: [] // replace with 'rides' once DB is connected
    });
  } catch (error) {
    next(error);
  }
};

// 3. Rider accepts a ride (Crucial logic: avoid double-booking)
exports.acceptRide = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const riderId = req.user ? req.user._id : 'rider_placeholder_id';

    /*
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return next(new AppError('Ride not found', 404));
    }

    // Check if another rider already accepted it
    if (ride.status !== 'REQUESTED') {
      return next(new AppError('This ride has already been accepted', 400));
    }

    // Update ride status and assign rider
    ride.riderId = riderId;
    ride.status = 'ACCEPTED';
    await ride.save();

    // Mark Rider profile as BUSY
    await User.findByIdAndUpdate(riderId, { availabilityStatus: 'BUSY' });
    */

    res.status(200).json({
      success: true,
      message: 'Ride accepted successfully',
      rideId,
      status: 'ACCEPTED'
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update ride status (ARRIVED -> STARTED -> COMPLETED)
exports.updateRideStatus = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { status } = req.body; // Expecting: 'ARRIVED', 'STARTED', or 'COMPLETED'
    const allowedStatuses = ['ARRIVED', 'STARTED', 'COMPLETED'];

    if (!allowedStatuses.includes(status)) {
      return next(new AppError('Invalid status transition', 400));
    }

    /*
    const ride = await Ride.findById(rideId);
    if (!ride) return next(new AppError('Ride not found', 404));

    ride.status = status;
    await ride.save();

    // If ride is COMPLETED, make the rider AVAILABLE again
    if (status === 'COMPLETED') {
      await User.findByIdAndUpdate(ride.riderId, { availabilityStatus: 'AVAILABLE' });
    }
    */

    res.status(200).json({
      success: true,
      message: `Ride marked as ${status}`
    });
  } catch (error) {
    next(error);
  }
};

// 5. Complete Cash Payment
exports.markPaymentComplete = async (req, res, next) => {
  try {
    const { rideId } = req.params;

    /*
    const ride = await Ride.findById(rideId);
    if (!ride) return next(new AppError('Ride not found', 404));

    ride.paymentStatus = 'PAID';
    await ride.save();
    */

    res.status(200).json({
      success: true,
      message: 'Cash payment confirmed successfully'
    });
  } catch (error) {
    next(error);
  }
};