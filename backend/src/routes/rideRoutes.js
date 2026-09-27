const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');

// Member B1's protect/restrictTo middleware will be mounted during integration.
// Controllers still reject requests that do not contain an authenticated req.user.
router.post('/request', rideController.requestRide);
router.get('/available', rideController.getAvailableRides);
router.get('/mine', rideController.getMyRides);
router.get('/:rideId', rideController.getRideById);
router.patch('/:rideId/accept', rideController.acceptRide);
router.patch('/:rideId/status', rideController.updateRideStatus);
router.patch('/:rideId/cancel', rideController.cancelRide);

module.exports = router;
