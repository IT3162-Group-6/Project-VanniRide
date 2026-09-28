const express = require('express');
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/:rideId/messages', chatController.getMessages);
router.post('/:rideId/messages', chatController.sendMessage);

module.exports = router;
