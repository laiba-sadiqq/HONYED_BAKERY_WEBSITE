const express = require('express');
const {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder
} = require('../Controllers/orderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// POST /api/orders - Create new order
// GET /api/orders - Get user's orders
router.route('/')
  .post(createOrder)
  .get(getMyOrders);

// GET /api/orders/:id - Get single order
router.get('/:id', getOrder);

// PUT /api/orders/:id/cancel - Cancel order
router.put('/:id/cancel', cancelOrder);

module.exports = router;