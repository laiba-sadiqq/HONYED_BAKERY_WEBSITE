const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { errorHandler } = require('./middleware/errorHandler');

// Load env vars
dotenv.config();

const DEBUG = process.env.NODE_ENV !== 'production';
const log = (...args) => { if (DEBUG) console.log(...args); };

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Enhanced CORS Configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://honyedbakery.vercel.app',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
          log('🌐 CORS blocked origin:', origin);
      callback(new Error('CORS policy violation'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept']
}));

// Enhanced request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  log(`\n🌐 [${timestamp}] ${req.method} ${req.originalUrl}`);
  log(`📍 Origin: ${req.headers.origin || 'No origin'}`);
  log(`🔑 Auth: ${req.headers.authorization ? 'Token present' : 'No token'}`);
  
  if (req.method === 'POST' || req.method === 'PUT') {
    log(`📦 Body:`, JSON.stringify(req.body).substring(0, 200));
  }
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    log('🛫 Preflight request');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return res.status(200).json({});
  }
  
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  log('📁 Uploads directory created');
}

// Static folder for uploads
app.use('/uploads', express.static(uploadsDir));

// Connect to MongoDB
const primaryMongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const fallbackMongoUri = 'mongodb://127.0.0.1:27017/ecommerce';

async function connectToDatabase() {
  const connectOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  try {
    await mongoose.connect(primaryMongoUri || fallbackMongoUri, connectOptions);
    log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);

    if ((process.env.NODE_ENV || 'development') !== 'production' && primaryMongoUri) {
      console.warn('⚠️ Falling back to local MongoDB at mongodb://127.0.0.1:27017/ecommerce');
      try {
        await mongoose.connect(fallbackMongoUri, connectOptions);
        log('✅ Local MongoDB fallback connected successfully');
      } catch (fallbackErr) {
        console.error('❌ Local MongoDB fallback also failed:', fallbackErr.message);
      }
    }
  }
}

connectToDatabase();

// Load and mount route files
try {
  const authRoutes = require('./routes/auth');
  const productRoutes = require('./routes/products');
  const cartRoutes = require('./routes/cart');   
  const orderRoutes = require('./routes/orders');
  const userRoutes = require('./routes/users');
  const adminRoutes = require('./routes/admin');

  // Mount routers
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  log('✅ Cart routes mounted at /api/cart');
  app.use('/api/orders', orderRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);
  
  log('✅ All routes loaded successfully');
} catch (err) {
  console.error('❌ Error loading routes:', err);
}

// Test endpoints for debugging
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is reachable!',
    timestamp: new Date().toISOString(),
    endpoints: {
      addToCart: 'POST /api/cart',
      getCart: 'GET /api/cart',
      syncCart: 'POST /api/cart/sync'
    }
  });
});

app.post('/api/test-auth', (req, res) => {
  const authHeader = req.headers.authorization;
  res.json({
    success: true,
    message: 'Auth test endpoint',
    authHeader: authHeader || 'No authorization header',
    tokenPresent: !!authHeader,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint (for Railway)
app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    port: process.env.PORT || 4000,
    environment: process.env.NODE_ENV || 'development'
  };
  res.json(health);
});

// Root endpoint for Railway health check
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Honeyed Bakery API',
    version: '1.0.0',
    health: '/api/health',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders',
      users: '/api/users',
      admin: '/api/admin',
      test: '/api/test'
    }
  });
});

// Handle 404 - Route not found
app.use('*', (req, res) => {
  console.error(`❌ 404: Route ${req.originalUrl} not found`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler (must be last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  log(`\n🚀 Server running on port ${PORT}`);

  if (DEBUG) {
    log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    log(`🔗 Health check: http://localhost:${PORT}/`);
    log(`🔗 API Health: http://localhost:${PORT}/api/health`);
    log(`🔗 Cart Endpoint: http://localhost:${PORT}/api/cart`);
    log(`🔗 Cart Sync Endpoint: http://localhost:${PORT}/api/cart/sync`);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    log('✅ Process terminated');
  });
});