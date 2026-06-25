const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const DEBUG = process.env.NODE_ENV !== 'production';
const log = (...args) => { if (DEBUG) console.log(...args); };

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    log('🛒 Getting cart for user:', req.user._id);
    
    let cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price images category stock'
      });

    log('📦 Found cart in DB:', cart ? 'Yes' : 'No');
    
    if (!cart) {
      // Create empty cart if not exists
      log('📝 Creating new cart for user');
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Debug: show what's in the cart
    log('🔍 Cart items in DB:', cart.items.length);
    cart.items.forEach((item, index) => {
      log(`   Item ${index + 1}:`, {
        productId: item.product?._id,
        quantity: item.quantity,
        productName: item.product?.name
      });
    });

    // Calculate totals
    const items = cart.items || [];
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.product?.price * item.quantity);
    }, 0);

    const cartResponse = {
      items: items.map(item => ({
        _id: item._id,
        product: {
          _id: item.product?._id,
          name: item.product?.name,
          price: item.product?.price,
          image: item.product?.images?.[0]
        },
        productId: item.product?._id,
        quantity: item.quantity,
        price: item.product?.price,
        itemTotal: (item.product?.price || 0) * item.quantity
      })),
      subtotal: subtotal,
      tax: subtotal * 0.05,
      shipping: subtotal > 2000 ? 0 : 200,
      total: subtotal + (subtotal > 2000 ? 0 : 200) + (subtotal * 0.05),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
    };

    log('✅ Sending cart response with', cartResponse.items.length, 'items');
    
    res.json({
      success: true,
      cart: cartResponse
    });

  } catch (error) {
    console.error('❌ Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cart'
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    log('➕ Adding to cart:', { productId, quantity });
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }
    
    // Find or create cart for user
    let cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: []
      });
      log('📝 Created new cart for user');
    }
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );
    
    if (existingItemIndex >= 0) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].price = product.price;
      log(`📈 Updated quantity for ${product.name}`);
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity: quantity,
        price: product.price
      });
      log(`🆕 Added new item: ${product.name}`);
    }
    
    // Save cart to database
    await cart.save();
    
    // Populate product details for response
    await cart.populate({
      path: 'items.product',
      select: 'name price images category'
    });
    
    // Calculate totals
    const items = cart.items || [];
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.product?.price * item.quantity);
    }, 0);
    
    const cartResponse = {
      items: items.map(item => ({
        _id: item._id,
        product: {
          _id: item.product?._id,
          name: item.product?.name,
          price: item.product?.price,
          image: item.product?.images?.[0]
        },
        productId: item.product?._id,
        quantity: item.quantity,
        price: item.product?.price,
        itemTotal: (item.product?.price || 0) * item.quantity
      })),
      subtotal: subtotal,
      tax: subtotal * 0.05,
      shipping: subtotal > 2000 ? 0 : 200,
      total: subtotal + (subtotal > 2000 ? 0 : 200) + (subtotal * 0.05),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
    };
    
    log(`✅ Item added to cart. Total items: ${cartResponse.itemCount}`);
    
    res.json({
      success: true,
      message: 'Item added to cart',
      cart: cartResponse
    });
    
  } catch (error) {
    console.error('❌ Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:itemId
// @access  Private
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    log('✏️ Updating cart item:', { itemId, quantity });
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }
    
    // Find cart
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Find item in cart
    const itemIndex = cart.items.findIndex(
      item => item._id.toString() === itemId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    
    // Get product to check stock
    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }
    
    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    
    // Save cart
    await cart.save();
    
    log('✅ Cart item updated');
    
    // Populate and calculate totals for response
    await cart.populate({
      path: 'items.product',
      select: 'name price images stock'
    });
    
    // Calculate totals
    const items = cart.items || [];
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.product?.price * item.quantity);
    }, 0);
    
    const cartResponse = {
      items: items.map(item => ({
        _id: item._id,
        product: {
          _id: item.product?._id,
          name: item.product?.name,
          price: item.product?.price,
          image: item.product?.images?.[0]
        },
        productId: item.product?._id,
        quantity: item.quantity,
        price: item.product?.price,
        itemTotal: (item.product?.price || 0) * item.quantity
      })),
      subtotal: subtotal,
      tax: subtotal * 0.05,
      shipping: subtotal > 2000 ? 0 : 200,
      total: subtotal + (subtotal > 2000 ? 0 : 200) + (subtotal * 0.05),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
    };
    
    res.json({
      success: true,
      message: 'Cart updated successfully',
      cart: cartResponse
    });
    
  } catch (error) {
    console.error('❌ Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item',
      error: error.message
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;
    
    log('🗑️ Removing cart item:', itemId);
    
    // Find cart and remove item
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Filter out the item
    const initialLength = cart.items.length;
    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    
    if (cart.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    
    await cart.save();
    
    // Populate for response
    await cart.populate({
      path: 'items.product',
      select: 'name price images'
    });
    
    // Calculate totals for response
    const items = cart.items || [];
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.product?.price * item.quantity);
    }, 0);
    
    const cartResponse = {
      items: items.map(item => ({
        _id: item._id,
        product: {
          _id: item.product?._id,
          name: item.product?.name,
          price: item.product?.price,
          image: item.product?.images?.[0]
        },
        productId: item.product?._id,
        quantity: item.quantity,
        price: item.product?.price,
        itemTotal: (item.product?.price || 0) * item.quantity
      })),
      subtotal: subtotal,
      tax: subtotal * 0.05,
      shipping: subtotal > 2000 ? 0 : 200,
      total: subtotal + (subtotal > 2000 ? 0 : 200) + (subtotal * 0.05),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
    };
    
    log('✅ Item removed from cart');
    
    res.json({
      success: true,
      message: 'Item removed from cart',
      cart: cartResponse
    });
    
  } catch (error) {
    console.error('❌ Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart',
      error: error.message
    });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    
    log('🗑️ Clearing cart for user:', userId);
    
    // Find and clear cart
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Clear items
    cart.items = [];
    await cart.save();
    
    log('✅ Cart cleared');
    
    const cartResponse = {
      items: [],
      subtotal: 0,
      tax: 0,
      shipping: 200,
      total: 200,
      itemCount: 0
    };
    
    res.json({
      success: true,
      message: 'Cart cleared successfully',
      cart: cartResponse
    });
    
  } catch (error) {
    console.error('❌ Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message
    });
  }
};

// @desc    Sync frontend cart with backend
// @route   POST /api/cart/sync
// @access  Private
// @desc    Sync frontend cart with backend
// @route   POST /api/cart/sync
// @access  Private
exports.syncCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { items: frontendItems } = req.body;
    
    log('🔄 Syncing cart for user:', userId);
    log('📦 Frontend sent items:', JSON.stringify(frontendItems, null, 2));
    
    // Accept ANY structure - just log it
    if (!frontendItems) {
      console.warn('⚠️ No items in request, using empty array');
    }
    
    // Get or create cart
    let cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      log('📝 Creating new cart');
      cart = new Cart({
        user: userId,
        items: []
      });
    }
    
    // Clear existing items
    cart.items = [];
    log('🧹 Cleared existing cart items');
    
    // If no items, just save empty cart
    if (!frontendItems || !Array.isArray(frontendItems) || frontendItems.length === 0) {
      await cart.save();
      log('✅ Saved empty cart');
      
      return res.json({
        success: true,
        message: 'Cart synced (empty)',
        cart: {
          items: [],
          subtotal: 0,
          tax: 0,
          shipping: 200,
          total: 200,
          itemCount: 0
        }
      });
    }
    
    // Process items - handle ANY structure
    const addedItems = [];
    
    for (const frontendItem of frontendItems) {
      try {
        log('🔍 Processing item:', frontendItem);
        
        // Extract product ID from ANY possible location
        let productId = null;
        
        if (frontendItem.productId) {
          productId = frontendItem.productId;
        } else if (frontendItem.product && typeof frontendItem.product === 'string') {
          productId = frontendItem.product;
        } else if (frontendItem.product && frontendItem.product._id) {
          productId = frontendItem.product._id;
        } else if (frontendItem._id) {
          productId = frontendItem._id;
        }
        
        if (!productId) {
          console.warn('⚠️ Skipping item - no product ID found:', frontendItem);
          continue;
        }
        
        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
          console.warn(`⚠️ Product ${productId} not found`);
          continue;
        }
        
        // Get quantity
        const quantity = frontendItem.quantity || 1;
        
        // Add to cart
        cart.items.push({
          product: productId,
          quantity: quantity,
          price: product.price
        });
        
        addedItems.push({
          productId: productId,
          name: product.name,
          quantity: quantity
        });
        
        log(`✅ Added ${product.name} (${quantity})`);
        
      } catch (itemError) {
        console.error('❌ Error processing item:', itemError);
      }
    }
    
    await cart.save();
    
    // Calculate totals
    await cart.populate({
      path: 'items.product',
      select: 'name price images'
    });
    
    const items = cart.items || [];
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.product?.price * item.quantity);
    }, 0);
    
    const cartResponse = {
      items: items.map(item => ({
        _id: item._id,
        product: {
          _id: item.product?._id,
          name: item.product?.name,
          price: item.product?.price,
          image: item.product?.images?.[0]
        },
        productId: item.product?._id,
        quantity: item.quantity,
        price: item.product?.price,
        itemTotal: (item.product?.price || 0) * item.quantity
      })),
      subtotal: subtotal,
      tax: subtotal * 0.05,
      shipping: subtotal > 2000 ? 0 : 200,
      total: subtotal + (subtotal > 2000 ? 0 : 200) + (subtotal * 0.05),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
    };
    
    log('✅ Cart synced successfully:', {
      added: addedItems.length,
      totalItems: cartResponse.items.length
    });
    
    return res.json({
      success: true,
      message: 'Cart synced successfully',
      cart: cartResponse
    });
    
  } catch (error) {
    console.error('❌ Sync cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync cart',
      error: error.message
    });
  }
};