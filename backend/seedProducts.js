const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables

// MongoDB connection string from environment variable
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/honeyed-bakery';

// Import Product model
const Product = require('./models/Product'); // Adjust path as needed

// Function to generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

// Enhanced product data with manually generated slugs - ONLY 5 MACARONS
const products = [
  // MACARONS - ONLY 5 FROM FRONTEND
  {
    name: 'Caramel Macaron',
    slug: 'caramel-macaron',
    description: 'Delicate almond shells filled with rich, buttery caramel ganache. A perfect balance of sweet and salty flavors.',
    price: 480,
    category: 'macarons',
    images: [
      {
        url: 'macarons/caramel.jpeg',
        alt: 'Caramel Macaron'
      }
    ],
    stock: 30,
    ingredients: ['Almond flour', 'Caramel ganache', 'Butter', 'Sea salt', 'Egg whites'],
    allergens: ['Eggs', 'Dairy', 'Tree Nuts'],
    weight: { value: 20, unit: 'g' },
    tags: ['french', 'caramel', 'almond'],
    featured: false,
    isActive: true,
    ratings: { average: 4.5, count: 142 }
  },
  {
    name: 'Lemon Zest Macaron',
    slug: 'lemon-zest-macaron',
    description: 'Zesty lemon shells with tangy lemon curd filling. A refreshing burst of citrus in every bite.',
    price: 450,
    category: 'macarons',
    images: [
      {
        url: 'macarons/lemon zest macaron.jpg',
        alt: 'Lemon Zest Macaron'
      }
    ],
    stock: 35,
    ingredients: ['Almond flour', 'Lemon curd', 'Lemon zest', 'Egg whites', 'Sugar'],
    allergens: ['Eggs', 'Dairy', 'Tree Nuts'],
    weight: { value: 20, unit: 'g' },
    tags: ['french', 'lemon', 'citrus'],
    featured: true,
    isActive: true,
    ratings: { average: 5.0, count: 168 }
  },
  {
    name: 'Oreo Macaron',
    slug: 'oreo-macaron',
    description: 'Chocolate almond shells filled with creamy Oreo buttercream and crushed cookie pieces. A cookies-and-cream lover\'s dream.',
    price: 520,
    category: 'macarons',
    images: [
      {
        url: 'macarons/oreo macaron.webp',
        alt: 'Oreo Macaron'
      }
    ],
    stock: 28,
    ingredients: ['Almond flour', 'Cocoa powder', 'Oreo buttercream', 'Crushed Oreos', 'Egg whites'],
    allergens: ['Eggs', 'Dairy', 'Tree Nuts', 'Gluten', 'Soy'],
    weight: { value: 22, unit: 'g' },
    tags: ['french', 'oreo', 'chocolate'],
    featured: true,
    isActive: true,
    ratings: { average: 5.0, count: 195 }
  },
  {
    name: 'Pistachio Macaron',
    slug: 'pistachio-macaron',
    description: 'Finely ground pistachio shells with silky pistachio ganache filling. Rich, nutty flavor with a hint of sweetness.',
    price: 500,
    category: 'macarons',
    images: [
      {
        url: 'macarons/pistachio macaron.jpg',
        alt: 'Pistachio Macaron'
      }
    ],
    stock: 25,
    ingredients: ['Almond flour', 'Pistachio paste', 'Ground pistachios', 'Egg whites', 'White chocolate'],
    allergens: ['Eggs', 'Dairy', 'Tree Nuts'],
    weight: { value: 20, unit: 'g' },
    tags: ['french', 'pistachio', 'premium'],
    featured: false,
    isActive: true,
    ratings: { average: 4.5, count: 153 }
  },
  {
    name: 'Strawberry Macaron',
    slug: 'strawberry-macaron',
    description: 'Beautiful pink shells filled with fresh strawberry buttercream made from real strawberries. Sweet, fruity, and utterly delightful.',
    price: 460,
    compareAtPrice: 490,
    category: 'macarons',
    images: [
      {
        url: 'macarons/strawberry macaron.jpg',
        alt: 'Strawberry Macaron'
      }
    ],
    stock: 32,
    ingredients: ['Almond flour', 'Fresh strawberries', 'Strawberry buttercream', 'Egg whites'],
    allergens: ['Eggs', 'Dairy', 'Tree Nuts'],
    weight: { value: 20, unit: 'g' },
    tags: ['french', 'strawberry', 'fruity'],
    featured: true,
    isActive: true,
    ratings: { average: 5.0, count: 176 }
  }
];

// Function to connect to MongoDB
async function connectDB() {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    
    // Remove deprecated options for newer MongoDB driver
    await mongoose.connect(MONGODB_URI);
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check if your MongoDB Atlas cluster is running');
    console.log('2. Verify your connection string in .env file');
    console.log('3. Check if your IP is whitelisted in MongoDB Atlas');
    console.log('4. Make sure you have internet connection');
    process.exit(1);
  }
}

// Function to check for existing products and update slugs
async function fixExistingProducts() {
  try {
    console.log('\n🔍 Checking existing products...');
    
    // Find products with null slugs
    const productsWithNullSlug = await Product.find({ slug: null });
    
    if (productsWithNullSlug.length > 0) {
      console.log(`⚠️  Found ${productsWithNullSlug.length} products with null slugs`);
      
      // Update slugs for existing products
      for (const product of productsWithNullSlug) {
        if (product.name) {
          const newSlug = generateSlug(product.name);
          product.slug = newSlug;
          await product.save();
          console.log(`   Updated slug for "${product.name}": ${newSlug}`);
        }
      }
      console.log('✅ Fixed existing product slugs');
    } else {
      console.log('✅ No products with null slugs found');
    }
    
  } catch (error) {
    console.error('❌ Error fixing existing products:', error.message);
  }
}

// Function to seed ONLY macarons with better error handling
async function seedProducts() {
  try {
    // Fix existing products first
    await fixExistingProducts();
    
    // Check for existing slugs to avoid duplicates
    console.log('\n🔍 Checking for existing product slugs...');
    const existingSlugs = await Product.find({}, 'slug');
    const existingSlugSet = new Set(existingSlugs.map(p => p.slug));
    
    // Filter out products that already exist (by slug)
    const newProducts = products.filter(product => !existingSlugSet.has(product.slug));
    
    if (newProducts.length === 0) {
      console.log('✅ All 5 macarons already exist in the database');
      return { inserted: 0, skipped: products.length };
    }
    
    console.log(`📥 Inserting ${newProducts.length} new macarons...`);
    
    // Insert only new products
    const insertedProducts = await Product.insertMany(newProducts);
    console.log(`✅ ${insertedProducts.length} macarons inserted successfully`);
    
    // Display summary of inserted macarons
    console.log('\n📊 Inserted Macarons:');
    insertedProducts.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name} - Rs ${product.price} (${product.stock} in stock)`);
    });
    
    // Calculate totals for all products
    const allProducts = await Product.find({});
    const totalValue = allProducts.reduce((sum, product) => sum + (product.price * product.stock), 0);
    const totalStock = allProducts.reduce((sum, product) => sum + product.stock, 0);
    
    console.log('\n💰 Overall Inventory Summary:');
    console.log(`   📈 Total products in database: ${allProducts.length}`);
    console.log(`   📦 Total stock units: ${totalStock}`);
    console.log(`   💵 Total inventory value: Rs ${totalValue.toLocaleString()}`);
    
    // Show macaron-specific summary
    const macarons = await Product.find({ category: 'macarons' });
    console.log(`   🎂 Total macarons: ${macarons.length}`);
    
    return {
      inserted: insertedProducts.length,
      skipped: products.length - insertedProducts.length,
      total: allProducts.length,
      macaronsCount: macarons.length
    };
    
  } catch (error) {
    console.error('❌ Error seeding products:', error.message);
    
    // Check for specific MongoDB errors
    if (error.code === 11000) {
      console.log('\n⚠️  Duplicate key error detected');
      console.log('💡 This usually means some products already exist in the database');
      console.log('💡 The script will skip duplicates and continue');
    }
    
    throw error;
  }
}

// Main execution function
async function main() {
  try {
    console.log('🚀 Starting macaron seeder...');
    console.log('============================\n');
    console.log('📋 Seeding 5 macarons from frontend:');
    console.log('1. Caramel Macaron');
    console.log('2. Lemon Zest Macaron');
    console.log('3. Oreo Macaron');
    console.log('4. Pistachio Macaron');
    console.log('5. Strawberry Macaron');
    console.log('\n============================');
    
    await connectDB();
    const result = await seedProducts();
    
    console.log('\n============================');
    console.log('✨ Macaron seeding completed!');
    console.log(`✅ Inserted: ${result.inserted} new macarons`);
    console.log(`⏭️  Skipped: ${result.skipped} existing macarons`);
    console.log(`📊 Total macarons in database: ${result.macaronsCount}`);
    console.log(`📊 Total products in database: ${result.total}`);
    console.log('\n🔌 Closing MongoDB connection...');
    
    await mongoose.disconnect();
    console.log('✅ MongoDB connection closed');
    console.log('🎉 Macarons seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seeder
main();