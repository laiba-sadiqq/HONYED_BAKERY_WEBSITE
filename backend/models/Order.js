const mongoose = require('mongoose');
const DEBUG = process.env.NODE_ENV !== 'production';
const log = (...args) => { if (DEBUG) console.log(...args); };

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  image: String,
  customization: {
    message: String,
    flavor: String,
    size: String
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
    // Removed required: true to let middleware generate it
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'Pakistan' }
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'card', 'online']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: String,
    paidAt: Date
  },
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  shippingFee: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    updatedAt: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  deliveryDate: Date,
  notes: String,
  cancelReason: String
}, {
  timestamps: true
});

// Generate order number BEFORE validation
orderSchema.pre('validate', function(next) {
  log('Pre-validate middleware: Generating order number');
  
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    this.orderNumber = `HB${year}${month}${day}${random}`;
    log('Generated order number:', this.orderNumber);
  }
  
  next();
});

// Add a post-save hook to verify
orderSchema.post('save', function(doc) {
  log('Order saved successfully with number:', doc.orderNumber);
});

module.exports = mongoose.model('Order', orderSchema);