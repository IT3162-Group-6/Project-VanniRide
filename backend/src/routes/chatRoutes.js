const express = require('express');
const chatController = require('../controllers/chatController');

const router = express.Router();

// Member B1's authentication middleware will be mounted during integration.
router.get('/:rideId/messages', chatController.getMessages);
router.post('/:rideId/messages', chatController.sendMessage);

module.exports = router;
