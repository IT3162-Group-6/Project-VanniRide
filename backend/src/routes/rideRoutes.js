const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', rideController.requestRide);
router.get('/available', rideController.getAvailableRides);
router.get('/', rideController.getMyRides);
router.get('/:rideId', rideController.getRideById);
router.patch('/:rideId/accept', rideController.acceptRide);
router.patch('/:rideId/status', rideController.updateRideStatus);
router.patch('/:rideId/cancel', rideController.cancelRide);
router.get(
  '/:rideId/cancellation-request',
  rideController.getPendingCancellationRequest
);
router.patch(
  '/:rideId/cancellation-request',
  rideController.respondToCancellation
);

module.exports = router;
