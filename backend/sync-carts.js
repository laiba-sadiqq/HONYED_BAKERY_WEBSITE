// sync-carts.js - One-time script to sync existing user carts
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Cart = require('./models/Cart');
const User = require('./models/User');

const DEBUG = process.env.NODE_ENV !== 'production';
const log = (...args) => { if (DEBUG) console.log(...args); };

dotenv.config();

async function syncAllCarts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    log('✅ Connected to MongoDB');
    
    // Get all users
    const users = await User.find({});
    log(`👥 Found ${users.length} users`);
    
    for (const user of users) {
      log(`\n🔄 Processing user: ${user.email}`);
      
      // Check if user has a cart
      let cart = await Cart.findOne({ user: user._id });
      
      if (!cart) {
        log(`📝 Creating new cart for ${user.email}`);
        cart = new Cart({
          user: user._id,
          items: []
        });
        await cart.save();
        log(`✅ Created cart for ${user.email}`);
      } else {
        log(`✅ User ${user.email} already has a cart with ${cart.items.length} items`);
      }
    }
    
    log('\n🎉 Cart sync completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error syncing carts:', error);
    process.exit(1);
  }
}

syncAllCarts();