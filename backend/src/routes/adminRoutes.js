const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(restrictTo('ADMIN'));

router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/status', adminController.updateUserStatus);

router.get('/rides', adminController.getAllRides);
router.get('/cancellations', adminController.getAllCancellations);
router.get('/payments', adminController.getAllPayments);
router.patch('/payments/:paymentId', adminController.correctPayment);
router.get('/ratings', adminController.getAllRatings);
router.get('/chat-access-requests', adminController.getChatAccessRequests);
router.patch(
  '/chat-access-requests/:requestId',
  adminController.reviewChatAccessRequest
);
router.get('/statistics', adminController.getAdminStatistics);

module.exports = router;
