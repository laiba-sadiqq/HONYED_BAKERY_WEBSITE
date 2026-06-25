const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendOrderConfirmation } = require('../utils/emailService');
const DEBUG = process.env.NODE_ENV !== 'production';
const log = (...args) => { if (DEBUG) console.log(...args); };

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    log('🛒 ======= ORDER CREATION START =======');
    log('👤 User ID from token:', req.user._id);
    log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    // EARLY VALIDATION: Ensure user has items to order
    const hasDbCart = !!(await Cart.findOne({ user: req.user._id, 'items.0': { $exists: true } }));
    const hasBodyItems = req.body.items && Array.isArray(req.body.items) && req.body.items.length > 0;
    
    if (!hasDbCart && !hasBodyItems) {
      log('❌ No items found in cart or request');
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty. Please add items before checkout.'
      });
    }
    
    // OPTION 1: Try to get cart from database
    log('🔍 Looking for cart in database...');
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (cart) {
      log('✅ Found cart in DB:', cart._id);
      log('📦 Cart items count in DB:', cart.items.length);
      
      // Populate product details
      await cart.populate('items.product');
      
      log('🔍 Cart items after populate:');
      cart.items.forEach((item, index) => {
        log(`   Item ${index + 1}:`, {
          productId: item.product?._id,
          productName: item.product?.name,
          quantity: item.quantity,
          price: item.price,
          productExists: !!item.product
        });
      });
      
      if (cart.items.length > 0) {
        // Use items from database cart
        log('✅ Using items from database cart');
        const orderItems = cart.items.map(item => ({
          product: item.product._id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
          image: item.product.images?.[0]?.url || item.product.image || null
        }));
        
        const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingFee = req.body.shippingFee || (subtotal > 2000 ? 0 : 200);
        const tax = subtotal * 0.05;
        const total = subtotal + shippingFee + tax;
        
        // Create order
        const orderData = {
          user: req.user._id,
          items: orderItems,
          shippingAddress: req.body.shippingAddress,
          paymentMethod: req.body.paymentMethod || 'cash',
          subtotal: subtotal,
          shippingFee: shippingFee,
          tax: tax,
          total: total,
          notes: req.body.notes || ''
        };
        
        log('📋 Creating order with DB cart items:', orderData);
        const order = await Order.create(orderData);
        
        // Send confirmation email (non-blocking)
        const user = await User.findById(req.user._id);
        if (user && user.email) {
          sendOrderConfirmation(user.email, order).catch(err => 
            console.error('Failed to send confirmation email:', err.message)
          );
        }
        
        // Decrement stock for each item
        log('📦 Decrementing stock for order items...');
        for (const item of orderItems) {
          const updated = await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: -item.quantity } },
            { new: true }
          );
          log(`📉 Stock decremented for product ${item.product}: -${item.quantity}, new stock: ${updated.stock}`);
        }
        
        // Clear cart
        cart.items = [];
        await cart.save();
        
        log('🎉 Order created from DB cart:', order.orderNumber);
        
        return res.status(201).json({
          success: true,
          message: 'Order placed successfully',
          orderNumber: order.orderNumber,
          order: order
        });
      }
    }
    
    // OPTION 2: Use items from request body if cart is empty
    log('🔍 Checking request body for items...');
    if (req.body.items && Array.isArray(req.body.items) && req.body.items.length > 0) {
      log('✅ Using items from request body:', req.body.items.length, 'items');
      
      const orderItems = req.body.items.map(item => ({
        product: item.product || item.productId,
        name: item.name || 'Product',
        quantity: item.quantity || 1,
        price: item.price || 0,
        image: item.image?.url || item.image || null
      }));
      
      const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shippingFee = req.body.shippingFee || (subtotal > 2000 ? 0 : 200);
      const tax = subtotal * 0.05;
      const total = subtotal + shippingFee + tax;
      
      // Validate required fields
      if (!req.body.shippingAddress) {
        return res.status(400).json({
          success: false,
          message: 'Shipping address is required'
        });
      }
      
      const orderData = {
        user: req.user._id,
        items: orderItems,
        shippingAddress: req.body.shippingAddress,
        paymentMethod: req.body.paymentMethod || 'cash',
        subtotal: subtotal,
        shippingFee: shippingFee,
        tax: tax,
        total: total,
        notes: req.body.notes || ''
      };
      
      log('📋 Creating order with request items:', orderData);
      const order = await Order.create(orderData);
      
      // Send confirmation email (non-blocking)
      const user = await User.findById(req.user._id);
      if (user && user.email) {
        sendOrderConfirmation(user.email, order).catch(err => 
          console.error('Failed to send confirmation email:', err.message)
        );
      }
      
      // Decrement stock for each item
      log('📦 Decrementing stock for order items...');
      for (const item of orderItems) {
        const updated = await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
        log(`📉 Stock decremented for product ${item.product}: -${item.quantity}, new stock: ${updated.stock}`);
      }
      
      log('🎉 Order created from request items:', order.orderNumber);
      
      return res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        orderNumber: order.orderNumber,
        order: order
      });
    }
    
    // OPTION 3: Both cart and request items are empty
    log('❌ No items found in cart or request');
    
    // Try one more time with different query
    log('🔍 Trying alternative cart query...');
    const altCart = await Cart.findOne({ user: req.user._id.toString() });
    if (altCart && altCart.items && altCart.items.length > 0) {
      log('✅ Found cart with toString() method');
      // Retry with this cart
      await altCart.populate('items.product');
      
      const orderItems = altCart.items.map(item => ({
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        image: item.product.images?.[0]?.url || item.product.image || null
      }));
      
      const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shippingFee = req.body.shippingFee || (subtotal > 2000 ? 0 : 200);
      const tax = subtotal * 0.05;
      const total = subtotal + shippingFee + tax;
      
      const orderData = {
        user: req.user._id,
        items: orderItems,
        shippingAddress: req.body.shippingAddress,
        paymentMethod: req.body.paymentMethod || 'cash',
        subtotal: subtotal,
        shippingFee: shippingFee,
        tax: tax,
        total: total,
        notes: req.body.notes || ''
      };
      
      log('📋 Creating order with alternative query:', orderData);
      const order = await Order.create(orderData);
      
      // Send confirmation email (non-blocking)
      const user = await User.findById(req.user._id);
      if (user && user.email) {
        sendOrderConfirmation(user.email, order).catch(err => 
          console.error('Failed to send confirmation email:', err.message)
        );
      }
      
      // Decrement stock for each item
      log('📦 Decrementing stock for order items...');
      for (const item of orderItems) {
        const updated = await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
        log(`📉 Stock decremented for product ${item.product}: -${item.quantity}, new stock: ${updated.stock}`);
      }
      
      // Clear cart
      altCart.items = [];
      await altCart.save();
      
      log('🎉 Order created with alternative query:', order.orderNumber);
      
      return res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        orderNumber: order.orderNumber,
        order: order
      });
    }
    
    // Final error (should not reach here due to early validation)
    console.error('❌ All attempts failed. Cart details:', {
      cartFound: !!cart,
      cartId: cart?._id,
      cartUserId: cart?.user,
      cartItemsCount: cart?.items?.length,
      requestItems: req.body.items?.length || 0,
      userFromToken: req.user._id,
      userType: typeof req.user._id
    });
    
    return res.status(400).json({
      success: false,
      message: 'Unable to process order. Please try again.'
    });
    
  } catch (error) {
    console.error('❌ Order creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product', 'name images price')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error getting user orders:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching orders'
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name images price category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Make sure user owns this order or is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error getting order:', error.message);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error fetching order'
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`
      });
    }

    // Update order status
    order.status = 'cancelled';
    order.cancelReason = reason.trim();
    order.statusHistory.push({
      status: 'cancelled',
      note: reason.trim(),
      updatedAt: new Date()
    });

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
      log(`Restored stock for product ${item.product}: +${item.quantity}`);
    }

    await order.save();

    // Get updated order with populated data
    const updatedOrder = await Order.findById(order._id)
      .populate('items.product', 'name')
      .populate('user', 'name');

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error cancelling order:', error.message);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error cancelling order'
    });
  }
};