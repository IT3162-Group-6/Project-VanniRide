const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');

// In future, Member 1's auth middleware will protect these
router.post('/request', rideController.requestRide);
router.get('/available', rideController.getAvailableRides);
router.patch('/:rideId/accept', rideController.acceptRide);
router.patch('/:rideId/status', rideController.updateRideStatus);
router.patch('/:rideId/payment', rideController.markPaymentComplete);

module.exports = router;