const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers([
  "1.1.1.1",
  "1.0.0.1",
  "8.8.8.8",
  "8.8.4.4"
]);

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// Import Product model
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  images: [{ url: String, alt: String }],
  stock: { type: Number, default: 50 },
  featured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  ratings: {
    average: { type: Number, default: 4.5 },
    count: { type: Number, default: 10 }
  }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema, 'products');

const filesToParse = [
  { file: '../cake.html', category: 'cakes' },
  { file: '../cookies.html', category: 'cookies' },
  { file: '../cupcakes.html', category: 'cupcakes' },
  { file: '../dounut.html', category: 'donuts' },
  { file: '../macarons.html', category: 'macaroons' } // Model expects 'macaroons'
];

function cleanDescription(desc) {
  return desc ? desc.trim().replace(/\s+/g, ' ') : '';
}

function parseHTMLProducts(filePath, category) {
  const absolutePath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    return [];
  }

  const html = fs.readFileSync(absolutePath, 'utf8');
  const products = [];

  // Match: <div class="product-card ... data-id="..." ...>
  // Let's use a regex to match the product cards
  const productCardRegex = /<div[^>]*class="[^"]*product-card[^"]*"[^>]*>/gi;
  let match;

  while ((match = productCardRegex.exec(html)) !== null) {
    const cardTag = match[0];
    
    // Extract attributes
    const idMatch = /data-id="([^"]*)"/i.exec(cardTag);
    const nameMatch = /data-name="([^"]*)"/i.exec(cardTag);
    const priceMatch = /data-price="([^"]*)"/i.exec(cardTag);
    const imageMatch = /data-image="([^"]*)"/i.exec(cardTag);
    const descMatch = /data-description="([^"]*)"/i.exec(cardTag);

    if (idMatch && nameMatch && priceMatch) {
      const name = nameMatch[1];
      const price = parseFloat(priceMatch[1].replace(/,/g, ''));
      const slug = name.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();

      const product = {
        _id: new mongoose.Types.ObjectId(idMatch[1]),
        name: name,
        slug: slug,
        price: price,
        description: descMatch ? cleanDescription(descMatch[1]) : '',
        category: category,
        images: [{
          url: imageMatch ? imageMatch[1] : '',
          alt: name
        }],
        stock: 50,
        featured: false,
        isActive: true,
        ratings: {
          average: parseFloat((4 + Math.random()).toFixed(1)),
          count: Math.floor(Math.random() * 200) + 10
        }
      };

      products.push(product);
    }
  }

  console.log(`Parsed ${products.length} products from ${filePath}`);
  return products;
}

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  // Clear existing products
  console.log('Clearing existing products...');
  await Product.deleteMany({});
  console.log('Cleared!');

  // Parse all pages and collect products
  let allProducts = [];
  
  // Add hardcoded featured products from index.html if needed
  // Let's add them manually to avoid mismatches
  const featured = [
    {
      _id: new mongoose.Types.ObjectId('695a2d904a5370eb877f488a'),
      name: 'Signature Chocolate Cupcake',
      slug: 'signature-chocolate-cupcake',
      price: 480,
      description: 'Rich chocolate cupcake with a chocolate ganache center, topped with chocolate buttercream and chocolate curls.',
      category: 'cupcakes',
      images: [{ url: 'Cupcakes/chocolate dream.webp', alt: 'Signature Chocolate Cupcake' }],
      stock: 50,
      featured: true,
      isActive: true,
      ratings: { average: 5.0, count: 180 }
    },
    {
      _id: new mongoose.Types.ObjectId('695a2d904a5370eb877f487c'),
      name: 'Belgium Chocolate Cake',
      slug: 'belgium-chocolate-cake',
      price: 2200,
      description: 'Rich Belgian chocolate layers with fudge filling, covered in dark chocolate ganache and edible gold leaf.',
      category: 'cakes',
      images: [{ url: 'Cakes/belgium_chocolate.jpeg', alt: 'Belgium Chocolate Cake' }],
      stock: 50,
      featured: true,
      isActive: true,
      ratings: { average: 5.0, count: 240 }
    },
    {
      _id: new mongoose.Types.ObjectId('695a2d904a5370eb877f48b6'),
      name: 'Strawberry Macarons',
      slug: 'strawberry-macarons-featured',
      price: 270,
      description: 'Delicate French macarons with fresh strawberry filling, crispy shells, and creamy center.',
      category: 'macaroons',
      images: [{ url: 'macrons/strawberry macron.jpg', alt: 'Strawberry Macarons' }],
      stock: 50,
      featured: true,
      isActive: true,
      ratings: { average: 4.8, count: 190 }
    }
  ];

  for (const { file, category } of filesToParse) {
    const products = parseHTMLProducts(file, category);
    allProducts = allProducts.concat(products);
  }

  // Filter out any duplicates by slug/ID before inserting
  const seenIds = new Set();
  const seenSlugs = new Set();
  
  // Add featured ones first so they have priority
  const finalProducts = [];
  
  for (const prod of featured) {
    seenIds.add(prod._id.toString());
    seenSlugs.add(prod.slug);
    finalProducts.push(prod);
  }

  for (const prod of allProducts) {
    const idStr = prod._id.toString();
    if (!seenIds.has(idStr) && !seenSlugs.has(prod.slug)) {
      seenIds.add(idStr);
      seenSlugs.add(prod.slug);
      finalProducts.push(prod);
    } else {
      console.log(`Skipped duplicate product: ${prod.name} (ID: ${idStr}, Slug: ${prod.slug})`);
    }
  }

  console.log(`Inserting ${finalProducts.length} products into database...`);
  await Product.insertMany(finalProducts);
  console.log('Seeding completed successfully! 🎉');

  await mongoose.disconnect();
  console.log('MongoDB connection closed.');
}

seed().catch(err => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
