const express = require('express');
const {
  getProfile,
  updateProfile,
  updatePassword,
  getWishlist,
  addToWishlist,
  removeFromWishlist
} = require('../Controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);

router.get('/wishlist', getWishlist);
router.post('/wishlist/:productId', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);

module.exports = router;