const express = require('express');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// Member B1's authentication middleware will be mounted during integration.
router.get('/:rideId/payment', paymentController.getPayment);
router.patch('/:rideId/payment', paymentController.markPaymentPaid);

module.exports = router;
