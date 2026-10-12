const express = require('express');
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllNotificationsRead);
router.patch('/:notificationId/read', notificationController.markNotificationRead);

module.exports = router;
