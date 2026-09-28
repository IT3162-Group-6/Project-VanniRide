const express = require('express');
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/:rideId/payment', paymentController.getPayment);
router.patch('/:rideId/payment', paymentController.markPaymentPaid);

module.exports = router;
