const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // Make sure you have this model
const { createProduct, updateProduct, deleteProduct, addReview, getRecentReviews } = require('../Controllers/productController');
const { protect, authorize } = require('../middleware/auth');

// POST /api/products - Create product (admin only)
router.post('/', protect, authorize('admin'), createProduct);

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', protect, authorize('admin'), updateProduct);

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', protect, authorize('admin'), deleteProduct);

// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
    try {
        const products = await Product.find()
            .select('_id name price description image rating reviews category slug stock')
            .lean();
        
        res.json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load products'
        });
    }
});

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
router.get('/category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        
        const products = await Product.find({ category: category })
            .select('_id name price description image rating reviews category slug stock')
            .lean();
        
        res.json({
            success: true,
            category,
            count: products.length,
            products
        });
    } catch (error) {
        console.error(`Error fetching ${req.params.category}:`, error);
        res.status(500).json({
            success: false,
            message: `Failed to load ${req.params.category}`
        });
    }
});

// @desc    Get recent reviews across products
// @route   GET /api/products/reviews/recent
// @access  Public
router.get('/reviews/recent', getRecentReviews);

// @desc    Add a product review
// @route   POST /api/products/:id/reviews
// @access  Private
router.post('/:id/reviews', protect, addReview);

// @desc    Get single product by ID (must be after other specific routes)
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .select('_id name price description image rating reviews category slug stock')
            .lean();
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load product'
        });
    }
});

// Make sure this line is at the end
module.exports = router;