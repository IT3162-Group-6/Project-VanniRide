const express = require('express');
const authController = require('../controllers/authController');
const { validateRegister } = require('../middlewares/validateMiddleware');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', validateRegister, authController.register);
router.post('/login', authController.login);
router.post('/logout', protect, authController.logout);

module.exports = router;
