const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart
} = require('../Controllers/cartController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ✅ ALL routes require authentication
router.use(protect);

// Main cart routes
router.route('/')
  .get(getCart)           // GET /api/cart - Get user's cart
  .post(addToCart)        // POST /api/cart - Add item to cart
  .delete(clearCart);     // DELETE /api/cart - Clear entire cart

// Sync frontend cart with backend
router.route('/sync')     
  .post(syncCart);        // POST /api/cart/sync

router.route('/:itemId')
  .put(updateCartItem)    // PUT /api/cart/:itemId - Update quantity
  .delete(removeFromCart); // DELETE /api/cart/:itemId - Remove item

module.exports = router;