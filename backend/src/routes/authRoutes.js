const express = require('express');
const authController = require('../controllers/authController');
const { validateRegister } = require('../middlewares/validateMiddleware');

const router = express.Router();

router.post('/register', validateRegister, authController.register);
router.post('/login', authController.login);

module.exports = router;