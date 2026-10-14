const express = require('express');
const ratingController = require('../controllers/ratingController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/rides/:rideId/rating', ratingController.createRating);
router.get('/riders/:riderId/ratings', ratingController.getRiderRatings);

module.exports = router;
