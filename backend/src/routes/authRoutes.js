const express = require('express');
const authController = require('../controllers/authController');
const { validateRegister } = require('../middlewares/validateMiddleware');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', validateRegister, authController.register);
router.post('/login', authController.login);
router.get('/security-questions', authController.getSecurityQuestions);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/switch-role', protect, authController.switchRole);
router.post('/change-password', protect, authController.changePassword);
router.post('/logout', protect, authController.logout);

module.exports = router;
