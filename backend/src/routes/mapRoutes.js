const express = require('express');
const mapController = require('../controllers/mapController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(restrictTo('CUSTOMER'));

router.get('/search', mapController.search);
router.get('/reverse', mapController.reverse);
router.post('/route-preview', mapController.previewRoute);

module.exports = router;
