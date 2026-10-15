const express = require('express');
const userController = require('../controllers/userController');
const historyController = require('../controllers/historyController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/recovery-settings', userController.updateRecoverySettings);
router.post('/roles', userController.addAccountRole);
router.get('/history', historyController.getMyHistory);
router.get(
  '/rider-availability-summary',
  userController.getRiderAvailabilitySummary
);
router.get(
  '/cancellation-allowance',
  userController.getCancellationAllowance
);

router.patch(
  '/rider/availability',
  restrictTo('RIDER'),
  userController.updateRiderAvailability
);

router.put(
  '/rider/profile',
  restrictTo('RIDER'),
  userController.updateRiderProfile
);

router.get(
  '/rider/earnings',
  restrictTo('RIDER'),
  historyController.getRiderEarnings
);

module.exports = router;
