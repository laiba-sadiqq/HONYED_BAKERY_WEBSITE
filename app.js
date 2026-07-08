// app.js - UNIVERSAL SCRIPT FOR ALL PAGES
// Honeyed Bakery - Instant Cart Functionality

// ===== PAGE CONFIGURATION =====
const pageConfig = {
    detectPageType() {
        const path = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        
        // Check search parameters first
        if (search.includes('cupcakes') || path.includes('cupcakes')) return 'cupcakes';
        if (search.includes('macarons') || path.includes('macarons')) return 'macarons';
        if (search.includes('cookies') || path.includes('cookies')) return 'cookies';
        if (search.includes('donuts') || path.includes('donuts') || path.includes('dounut')) return 'donuts';
        if (search.includes('cake') || (path.includes('cake') && !path.includes('cupcakes'))) return 'cakes';
        if (path.includes('index') || path === '/' || path === '' || path.includes('home')) return 'home';
        return 'products';
    },
    
    getGridId() {
        const type = this.detectPageType();
        const gridMap = {
            'cupcakes': 'cupcake-grid',
            'macarons': 'macaron-grid',
            'cookies': 'cookie-grid',
            'donuts': 'donut-grid',
            'cakes': 'cake-grid',
            'home': 'featured-grid',
            'products': 'product-grid'
        };
        return gridMap[type] || 'product-grid';
    },
    
    getModalId() {
        const type = this.detectPageType();
        const modalMap = {
            'cupcakes': 'cupcake-modal',
            'macarons': 'macaron-modal',
            'cookies': 'cookie-modal',
            'donuts': 'donut-modal',
            'cakes': 'cake-modal',
            'home': 'product-modal',
            'products': 'product-modal'
        };
        return modalMap[type] || 'product-modal';
    },
    
    getAddButtonClass() {
        const type = this.detectPageType();
        const buttonMap = {
            'cupcakes': '.add-to-cupcake-modal',
            'macarons': '.add-to-macaron-modal',
            'cookies': '.add-to-cookie-modal',
            'donuts': '.add-to-donut-modal',
            'cakes': '.add-to-cake-modal',
            'home': '.add-to-product-modal',
            'products': '.add-to-product-modal'
        };
        return buttonMap[type] || '.add-to-product-modal';
    },
    
    getPageName() {
        const type = this.detectPageType();
        const names = {
            'cupcakes': 'Cupcakes',
            'macarons': 'Macarons',
            'cookies': 'Cookies',
            'donuts': 'Donuts',
            'cakes': 'Cakes',
            'home': 'Home',
            'products': 'Products'
        };
        return names[type] || 'Products';
    },
    
    getItemType() {
        const type = this.detectPageType();
        const itemMap = {
            'cupcakes': 'cupcake',
            'macarons': 'macaron',
            'cookies': 'cookie',
            'donuts': 'donut',
            'cakes': 'cake',
            'home': 'item',
            'products': 'item'
        };
        return itemMap[type] || 'item';
    }
};

// ===== DEBUG & INITIALIZATION =====
// Controlled debug logging
const DEBUG = !!(window.APP_CONFIG && window.APP_CONFIG.DEBUG);
const log = (...args) => { if (DEBUG) console.log(...args); };
log('🔧 app.js - Universal Script Loaded');
log('📄 Page Type:', pageConfig.detectPageType());
log('🏷️  Page Name:', pageConfig.getPageName());
log('🎯 Item Type:', pageConfig.getItemType());
log('🔗 API available:', !!window.cartAPI);
log('🔐 User logged in:', window.cartAPI?.isAuthenticated());

// ===== MAIN APPLICATION SCRIPT =====
// Global state
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let currentProductData = null;

// DOM Elements cache - AUTO-DETECTING
const elements = {
    // Navigation (same for all pages)
    quickLinksToggle: document.getElementById('quick-links-toggle'),
    wishlistToggle: document.getElementById('wishlist-toggle'),
    desktopWishlistToggle: document.getElementById('desktop-wishlist-toggle'),
    mobileCartToggle: document.getElementById('mobile-cart-toggle'),
    desktopCartToggle: document.getElementById('desktop-cart-toggle'),
    quickLinksSlider: document.getElementById('quick-links-slider'),
    wishlistSlider: document.getElementById('wishlist-slider'),
    cartSlider: document.getElementById('cart-slider'),
    sliderOverlay: document.getElementById('slider-overlay'),
    closeQuickLinks: document.getElementById('close-quick-links'),
    closeWishlist: document.getElementById('close-wishlist'),
    closeCart: document.getElementById('close-cart'),
    
    // Wishlist (same for all pages)
    mobileWishlistCount: document.getElementById('mobile-wishlist-count'),
    desktopWishlistCount: document.getElementById('desktop-wishlist-count'),
    wishlistItems: document.getElementById('wishlist-items'),
    emptyWishlist: document.getElementById('empty-wishlist'),
    
    // Cart (same for all pages)
    mobileCartCount: document.getElementById('mobile-cart-count'),
    desktopCartCount: document.getElementById('desktop-cart-count'),
    cartItemsContainer: document.getElementById('cart-items-container'),
    emptyCartMessage: document.getElementById('empty-cart-message'),
    cartTotal: document.getElementById('cart-total'),
    checkoutBtn: document.getElementById('checkout-btn'),
    
    // Toast (same for all pages)
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),
    
    // Modal - AUTO DETECTED
    productModal: document.getElementById(pageConfig.getModalId()),
    modalClose: document.querySelector('.modal-close'),
    modalImage: document.getElementById('modal-image'),
    modalTitle: document.getElementById('modal-title'),
    modalDescription: document.getElementById('modal-description'),
    modalPrice: document.getElementById('modal-price'),
    modalOriginalPrice: document.getElementById('modal-original-price'),
    modalReviews: document.getElementById('modal-reviews'),
    quantityInput: document.querySelector('.quantity-input'),
    minusBtn: document.querySelector('.quantity-btn.minus'),
    plusBtn: document.querySelector('.quantity-btn.plus'),
    addToModalBtn: document.querySelector(pageConfig.getAddButtonClass()),
    modalWishlistBtn: document.querySelector('.modal-content .wishlist-btn'),
    
    // Search
    searchIcon: document.querySelector('.bx-search'),
    
    // Product Grid - AUTO DETECTED
    productGrid: document.getElementById(pageConfig.getGridId())
};

// Utility Functions
const utils = {
    // Get product data from element
    getProductData(element) {
        const data = {
            id: element.getAttribute('data-id'),
            productId: element.getAttribute('data-product-id') || element.getAttribute('data-id'),
            name: element.getAttribute('data-name'),
            price: parseFloat(element.getAttribute('data-price')),
            originalPrice: element.getAttribute('data-original-price') ? 
                parseFloat(element.getAttribute('data-original-price')) : null,
            image: element.getAttribute('data-image'),
            description: element.getAttribute('data-description'),
            slug: element.getAttribute('data-slug') || ''
        };
        
        log('📦 Product data:', data.name);
        return data;
    },

    // Format price with commas
    formatPrice(price) {
        return new Intl.NumberFormat('en-PK').format(price);
    },

    // Show toast notification
    showToast(message, type = 'success') {
        if (!elements.toast || !elements.toastMessage) return;
        
        elements.toastMessage.textContent = message;
        elements.toast.style.background = type === 'error' ? '#dc2626' : 
                                         type === 'info' ? '#3b82f6' : '#ec4899';
        elements.toast.classList.add('show');
        
        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 3000);
    },

    // Create confetti animation
    createConfetti() {
        const colors = ['#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
        
        for (let i = 0; i < 12; i++) {
            const confetti = document.createElement('div');
            
            confetti.style.position = 'fixed';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-10px';
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = '50%';
            confetti.style.zIndex = '9999';
            confetti.style.pointerEvents = 'none';
            
            document.body.appendChild(confetti);
            
            const animationDuration = Math.random() * 2 + 1;
            confetti.animate([
                { transform: 'translateY(-10px) rotate(0deg)', opacity: 1 },
                { transform: `translateY(100vh) rotate(${Math.random() * 360}deg)`, opacity: 0 }
            ], {
                duration: animationDuration * 1000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            setTimeout(() => confetti.remove(), animationDuration * 1000);
        }
    },

    // Update button wishlist state
    updateWishlistButtonState(button, productId) {
        const isInWishlist = wishlist.find(item => item.id === productId);
        
        if (isInWishlist) {
            button.innerHTML = '<i class="bx bxs-heart text-lg text-red-500"></i>';
            button.classList.add('text-red-500');
            button.classList.remove('text-pink-500', 'border-pink-500');
            button.classList.add('border-red-500');
        } else {
            button.innerHTML = '<i class="bx bx-heart text-lg"></i>';
            button.classList.remove('text-red-500', 'border-red-500');
            button.classList.add('text-pink-500', 'border-pink-500');
        }
    },

    // Mark product as out of stock
    markProductOutOfStock(productId, productName) {
                log(`🚫 ${productName} is out of stock`);
        
        document.querySelectorAll(`[data-id="${productId}"]`).forEach(card => {
            const addToCartBtn = card.querySelector('.add-to-cart');
            if (addToCartBtn) {
                addToCartBtn.disabled = true;
                addToCartBtn.innerHTML = '<i class="bx bx-x text-lg"></i>';
                addToCartBtn.classList.remove('bg-pink-500', 'hover:scale-105');
                addToCartBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
                addToCartBtn.title = 'Out of stock';
            }
            
            card.classList.add('opacity-70');
        });
    }
};

// Navigation Management
const navigation = {
    init() {
        this.setupSliderToggle();
        this.setupSearch();
        this.setupAuthButtons();
    },

    setupSliderToggle() {
        // Open sliders
        elements.quickLinksToggle?.addEventListener('click', () => this.openSlider(elements.quickLinksSlider));
        elements.wishlistToggle?.addEventListener('click', () => this.openSlider(elements.wishlistSlider));
        elements.desktopWishlistToggle?.addEventListener('click', () => this.openSlider(elements.wishlistSlider));
        elements.mobileCartToggle?.addEventListener('click', () => this.openCartSlider());
        elements.desktopCartToggle?.addEventListener('click', () => this.openCartSlider());
        
        // Close sliders
        elements.closeQuickLinks?.addEventListener('click', () => this.closeAllSliders());
        elements.closeWishlist?.addEventListener('click', () => this.closeAllSliders());
        elements.closeCart?.addEventListener('click', () => this.closeAllSliders());
        elements.sliderOverlay?.addEventListener('click', () => this.closeAllSliders());
    },

    async openCartSlider() {
        await cartManager.loadCart();
        this.openSlider(elements.cartSlider);
    },

    openSlider(slider) {
        if (!slider) return;
        slider.classList.add('active');
        elements.sliderOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeAllSliders() {
        elements.quickLinksSlider?.classList.remove('active');
        elements.wishlistSlider?.classList.remove('active');
        elements.cartSlider?.classList.remove('active');
        elements.sliderOverlay?.classList.remove('active');
        document.body.style.overflow = 'auto';
    },

    setupSearch() {
        elements.searchIcon?.addEventListener('click', () => {
            const searchInput = document.getElementById('desktop-search');
            if (searchInput) {
                const searchTerm = searchInput.value.trim();
                if (searchTerm) {
                    window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
                }
            }
        });
        
        const searchInput = document.getElementById('desktop-search');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const searchTerm = searchInput.value.trim();
                    if (searchTerm) {
                        window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
                    }
                }
            });
        }
    },

    setupAuthButtons() {
        this.updateAuthUI();
        
        window.addEventListener('storage', (e) => {
            if (e.key === 'token') {
                this.updateAuthUI();
                cartManager.updateCartUI();
            }
        });
    },

    updateAuthUI() {
        const isLoggedIn = window.cartAPI?.isAuthenticated() || false;
        const authElements = document.querySelectorAll('.auth-status');
        
        authElements.forEach(element => {
            if (element.classList.contains('logged-in')) {
                element.style.display = isLoggedIn ? 'block' : 'none';
            } else if (element.classList.contains('logged-out')) {
                element.style.display = isLoggedIn ? 'none' : 'block';
            }
        });
    }
};

// Wishlist Management (Frontend only)
const wishlistManager = {
    init() {
        this.updateWishlistCounts();
        this.renderWishlistItems();
    },

    toggleWishlist(productId, productData = null) {
        const existingIndex = wishlist.findIndex(item => item.id === productId);
        
        if (existingIndex >= 0) {
            wishlist.splice(existingIndex, 1);
            utils.showToast('Removed from wishlist', 'info');
        } else {
            if (productData) {
                wishlist.push(productData);
            } else {
                const card = document.querySelector(`[data-id="${productId}"]`);
                if (card) {
                    wishlist.push(utils.getProductData(card));
                }
            }
            utils.showToast('Added to wishlist!');
        }
        
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        this.updateWishlistCounts();
        this.renderWishlistItems();
        
        // Update all wishlist buttons on the page
        document.querySelectorAll('.wishlist-btn').forEach(button => {
            const card = button.closest('.product-card');
            if (card) {
                const cardProductId = card.getAttribute('data-id');
                utils.updateWishlistButtonState(button, cardProductId);
            }
        });
    },

    updateWishlistCounts() {
        const count = wishlist.length;
        const elementsToUpdate = [elements.mobileWishlistCount, elements.desktopWishlistCount];
        
        elementsToUpdate.forEach(element => {
            if (element) {
                element.textContent = count;
                element.style.display = count === 0 ? 'none' : 'flex';
            }
        });
    },

    renderWishlistItems() {
        if (!elements.wishlistItems || !elements.emptyWishlist) return;
        
        if (wishlist.length === 0) {
            elements.wishlistItems.innerHTML = '';
            elements.emptyWishlist.style.display = 'block';
            return;
        }
        
        elements.emptyWishlist.style.display = 'none';
        elements.wishlistItems.innerHTML = wishlist.map((product, index) => `
            <div class="wishlist-item flex items-center justify-between py-4 border-b border-gray-200 last:border-b-0 hover:bg-pink-50 rounded-lg px-3 transition-all">
                <div class="flex items-center justify-between gap-3 w-full">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="flex-shrink-0">
                            <img src="${product.image}" alt="${product.name}" class="wishlist-square-image" 
                                 onerror="this.onerror=null;this.src='https://via.placeholder.com/80x80?text=${pageConfig.getPageName()}'">
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-gray-800 truncate" title="${product.name}">${product.name}</div>
                            <div class="text-pink-600 font-bold">Rs ${utils.formatPrice(product.price)}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button class="add-to-cart-from-wishlist bg-pink-500 text-white p-2 rounded-full hover:scale-105 transition-all" 
                               data-product-id="${product.id}" 
                                data-product-name="${product.name}"
                                title="Add to Cart">
                            <i class='bx bx-plus text-lg'></i>
                        </button>
                        <button class="remove-from-wishlist text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-all" 
                                data-index="${index}" 
                                data-id="${product.id}" 
                                title="Remove from Wishlist">
                            <i class='bx bx-trash text-lg'></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        this.addWishlistEventListeners();
    },

    addWishlistEventListeners() {
        // Remove from wishlist buttons
        document.querySelectorAll('.remove-from-wishlist').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = button.getAttribute('data-id');
                this.toggleWishlist(productId);
            });
        });
        
        // Add to cart from wishlist buttons
        document.querySelectorAll('.add-to-cart-from-wishlist').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const productId = button.getAttribute('data-product-id');
                const productName = button.getAttribute('data-product-name');
                
                if (!window.cartAPI?.isAuthenticated()) {
                    const proceed = confirm('Please login to add items to cart. Login now?');
                    if (proceed) {
                        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
                    }
                    return;
                }
                
                await cartManager.addToCart(productId, productName, 1);
            });
        });
    }
};

// Cart Management - OPTIMIZED Version with Instant Feedback
const cartManager = {
    // Track loading states per product
    loadingProducts: new Set(),
    
    async init() {
        log('🚀 Initializing cart manager...');
        this.setupCheckout();
        this.setupCartEventListeners();
        
        // Listen for cart updates from cartAPI
        window.addEventListener('cartUpdated', (event) => {
            log('🔄 Cart update event received');
            this.renderCart(event.detail?.cart);
        });
        
        // Listen for loading states from cartAPI
        document.addEventListener('cartLoading', (event) => {
            const { productId, loading } = event.detail || {};
            if (productId) {
                if (loading) {
                    this.loadingProducts.add(productId);
                } else {
                    this.loadingProducts.delete(productId);
                }
                this.updateButtonStates();
            }
        });
        
        // Initial load
        await this.updateCartUI();
    },

    updateButtonStates() {
        document.querySelectorAll('.add-to-cart').forEach(button => {
            const card = button.closest('.product-card');
            if (card) {
                const productId = card.getAttribute('data-id');
                
                if (this.loadingProducts.has(productId)) {
                    button.innerHTML = '<i class="bx bx-loader-alt text-lg animate-spin"></i>';
                    button.classList.add('opacity-70', 'cursor-wait', 'loading');
                    button.disabled = true;
                } else {
                    button.innerHTML = '<i class="bx bx-plus text-lg"></i>';
                    button.classList.remove('opacity-70', 'cursor-wait', 'loading');
                    button.disabled = false;
                }
            }
        });
    },

    async loadCart() {
        try {
            log('🔄 Loading cart...');
            const cart = await window.cartAPI.getCart();
            this.renderCart(cart);
        } catch (error) {
            console.error('❌ Error loading cart:', error);
            this.renderCart({ items: [], total: 0, itemCount: 0 });
        }
    },

   // In app.js, update the addToCart function in cartManager:
async addToCart(productId, productName, quantity = 1) {
    log('🚀 INSTANT add to cart:', { productId, productName });
    
    // Check if cartAPI exists
    if (!window.cartAPI) {
        console.error('❌ cartAPI is not defined!');
        utils.showToast('Cart system error. Please refresh the page.', 'error');
        return;
    }
    
    // Check authentication
    if (!window.cartAPI.isAuthenticated()) {
        const proceed = confirm('Please login to add items to cart. Login now?');
        if (proceed) {
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return;
    }
    
    log('✅ User is authenticated, token exists');
    
    // IMMEDIATE VISUAL FEEDBACK
    utils.showToast(`Adding ${productName}...`, 'info');
    
    // Mark as loading
    this.setProductLoading(productId, true);
    
    // Set a safety timeout to clear loading state
    const safetyTimeout = setTimeout(() => {
        this.setProductLoading(productId, false);
    }, 5000);
    
    try {
        // Call cartAPI (which has optimistic updates)
        log('📤 Calling cartAPI.addToCart...');
        const result = await window.cartAPI.addToCart(productId, quantity, productName);
        
        clearTimeout(safetyTimeout);
        
        log('📥 cartAPI.addToCart result:', result);
        
        if (result.success) {
            utils.showToast(`${productName} added to cart! 🎉`);
            utils.createConfetti();
        } else if (result.requiresLogin) {
            const proceed = confirm('Please login to add items to cart. Login now?');
            if (proceed) {
                window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
            }
        } else if (result.message?.toLowerCase().includes('out of stock') || 
                  result.message?.toLowerCase().includes('stock')) {
            utils.showToast(`Sorry! ${productName} is out of stock.`, 'error');
            utils.markProductOutOfStock(productId, productName);
        } else {
            // Show success even if backend failed (optimistic UI worked)
            utils.showToast(result.message || `${productName} added!`, 'info');
        }
        
        return result;
    } catch (error) {
        clearTimeout(safetyTimeout);
        console.error('❌ Add to cart error:', error);
        
        // Don't show error - optimistic UI already showed success
        utils.showToast(`${productName} added to cart!`, 'success');
        return { success: true, message: 'Added to cart!' };
    } finally {
        // Remove loading state after a short delay
        setTimeout(() => {
            this.setProductLoading(productId, false);
        }, 1000);
    }
},
    setProductLoading(productId, loading) {
        if (loading) {
            this.loadingProducts.add(productId);
        } else {
            this.loadingProducts.delete(productId);
        }
        
        // Update button states
        this.updateButtonStates();
        
        // Also update modal button if open
        if (currentProductData && currentProductData.id === productId && elements.addToModalBtn) {
            if (loading) {
                elements.addToModalBtn.innerHTML = '<i class="bx bx-loader-alt animate-spin mr-2"></i> Adding...';
                elements.addToModalBtn.classList.add('opacity-70', 'cursor-wait');
                elements.addToModalBtn.disabled = true;
            } else {
                elements.addToModalBtn.innerHTML = '<i class="bx bx-plus mr-2"></i> Add to Cart';
                elements.addToModalBtn.classList.remove('opacity-70', 'cursor-wait');
                elements.addToModalBtn.disabled = false;
            }
        }
    },
      
    async updateQuantity(itemId, change) {
        try {
            log('✏️ Updating quantity:', itemId, change);
            const result = await window.cartAPI.updateCartItem(itemId, change);
            
            if (result.success && result.cart) {
                this.renderCart(result.cart);
                utils.showToast('Quantity updated', 'success');
            }
        } catch (error) {
            console.error('Update quantity error:', error);
            utils.showToast('Failed to update quantity', 'error');
        }
    },

    async removeItem(itemId) {
        try {
            const result = await window.cartAPI.removeFromCart(itemId);
            
            if (result.success) {
                this.renderCart(result.cart || { items: [], total: 0, itemCount: 0 });
                utils.showToast('Item removed', 'info');
            }
        } catch (error) {
            console.error('Remove item error:', error);
            utils.showToast('Failed to remove item', 'error');
        }
    },

    async updateCartUI() {
        try {
            log('🎨 Updating cart UI...');
            const cart = await window.cartAPI.getCart();
            this.renderCart(cart);
        } catch (error) {
            console.error('❌ Update cart UI error:', error);
        }
    },

    renderCart(cart) {
        if (!cart) {
            log('⚠️ No cart data');
            this.showEmptyCart();
            return;
        }
        
        // Ensure cart has items property
        const items = cart.items || [];
        const itemCount = cart.itemCount || items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        log('🎨 Rendering cart:', { 
            itemCount, 
            itemsLength: items.length, 
            cartTotal: cart.total,
            cartSubtotal: cart.subtotal,
            cart
        });
        
        // Update cart counts IMMEDIATELY
        this.updateCartCounts(itemCount);
        
        // Update cart total
        if (elements.cartTotal) {
            elements.cartTotal.textContent = `Rs ${utils.formatPrice(cart.total || 0)}`;
        }
        
        // Update checkout button
        if (elements.checkoutBtn) {
            elements.checkoutBtn.disabled = itemCount === 0;
            elements.checkoutBtn.classList.toggle('opacity-50', itemCount === 0);
            elements.checkoutBtn.classList.toggle('cursor-not-allowed', itemCount === 0);
        }
        
        // Render cart items
        if (elements.cartItemsContainer && elements.emptyCartMessage) {
            if (itemCount === 0 || items.length === 0) {
                this.showEmptyCart();
                return;
            }
            
            elements.emptyCartMessage.style.display = 'none';
            
            // Create cart items HTML
            let cartItemsHTML = '';
            
            items.forEach(item => {
                // Get product info with fallbacks
                const product = item.product || {};
                const itemId = item._id || item.id || `item_${Date.now()}`;
                const productName = product.name || 'Product';
                const productImage = product.image || 'https://via.placeholder.com/45x45?text=Product';
                const price = item.price || 0;
                const quantity = item.quantity || 1;
                const itemTotal = item.itemTotal || (price * quantity);
                
                cartItemsHTML += `
                <div class="cart-item flex items-center justify-between py-3 px-2 border-b border-gray-100 last:border-b-0 hover:bg-pink-50 rounded-lg transition-all">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="flex-shrink-0">
                            <img src="${productImage}" 
                                 alt="${productName}" 
                                 class="cart-square-image w-12 h-12 object-cover rounded-lg"
                                 onerror="this.onerror=null;this.src='https://via.placeholder.com/45x45?text=Product'">
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-sm text-gray-800 truncate" title="${productName}">
                                ${productName}
                            </div>
                            <div class="text-xs text-gray-500">Rs ${utils.formatPrice(price)} each</div>
                            <div class="cart-item-quantity mt-1">
                                <div class="quantity-control flex items-center gap-2">
                                    <button class="quantity-btn-small minus-quantity bg-gray-100 hover:bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center" 
                                            data-item-id="${itemId}">
                                        <i class='bx bx-minus text-xs'></i>
                                    </button>
                                    <span class="quantity-display text-xs font-medium min-w-[20px] text-center">${quantity}</span>
                                    <button class="quantity-btn-small plus-quantity bg-gray-100 hover:bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center" 
                                            data-item-id="${itemId}">
                                        <i class='bx bx-plus text-xs'></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 flex-shrink-0">
                        <span class="font-bold text-pink-600 text-sm whitespace-nowrap">
                            Rs ${utils.formatPrice(itemTotal)}
                        </span>
                        <button class="remove-item text-red-500 hover:text-red-700 hover:bg-red-50 w-8 h-8 rounded-full flex items-center justify-center transition-all" 
                                data-item-id="${itemId}"
                                title="Remove item">
                            <i class='bx bx-trash text-sm'></i>
                        </button>
                    </div>
                </div>
                `;
            });
            
            elements.cartItemsContainer.innerHTML = cartItemsHTML;
            this.setupCartEventListeners();
        }
    },

    showEmptyCart() {
        if (elements.cartItemsContainer && elements.emptyCartMessage) {
            elements.cartItemsContainer.innerHTML = '';
            elements.emptyCartMessage.style.display = 'block';
            this.updateCartCounts(0);
            if (elements.cartTotal) {
                elements.cartTotal.textContent = 'Rs 0';
            }
        }
    },

    updateCartCounts(count) {
        const elementsToUpdate = [elements.mobileCartCount, elements.desktopCartCount];
        
        elementsToUpdate.forEach(element => {
            if (element) {
                element.textContent = count;
                element.style.display = count === 0 ? 'none' : 'flex';
            }
        });
    },

    setupCartEventListeners() {
        elements.cartItemsContainer?.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const itemId = target.getAttribute('data-item-id');
            if (!itemId) return;
            
            if (target.classList.contains('minus-quantity')) {
                e.stopPropagation();
                await this.updateQuantity(itemId, -1);
            } else if (target.classList.contains('plus-quantity')) {
                e.stopPropagation();
                await this.updateQuantity(itemId, 1);
            } else if (target.classList.contains('remove-item')) {
                e.stopPropagation();
                await this.removeItem(itemId);
            }
        });
    },

    setupCheckout() {
        elements.checkoutBtn?.addEventListener('click', async () => {
            if (!window.cartAPI?.isAuthenticated()) {
                const proceed = confirm('You need to login to checkout. Would you like to login now?');
                if (proceed) {
                    window.location.href = `login.html?redirect=${encodeURIComponent('checkout.html')}`;
                }
                return;
            }
            
            // Check if cart is empty using cached cart (no double fetch)
            const cart = window.cartAPI.cache?.cart || await window.cartAPI.getCart();
            if (!cart || cart.itemCount === 0) {
                utils.showToast('Your cart is empty! Add items to checkout.', 'error');
                return;
            }
            
            // Save cart to localStorage so checkout page can read it instantly
            localStorage.setItem('honeyed-cart', JSON.stringify(cart));
            
            // Redirect to checkout (no leading slash — works on Vercel)
            window.location.href = 'checkout.html';
        });
    }
};

// Modal Management
const modalManager = {
    init() {
        this.setupModalEventListeners();
    },

    setupModalEventListeners() {
        if (!elements.productModal) {
            log('⚠️ No modal found on this page');
            return;
        }
        
        elements.modalClose?.addEventListener('click', () => this.closeModal());
        elements.productModal?.addEventListener('click', (e) => {
            if (e.target === elements.productModal) this.closeModal();
        });
        
        elements.minusBtn?.addEventListener('click', () => this.adjustQuantity(-1));
        elements.plusBtn?.addEventListener('click', () => this.adjustQuantity(1));
        
        elements.addToModalBtn?.addEventListener('click', () => this.addToCartFromModal());
        
        elements.modalWishlistBtn?.addEventListener('click', () => this.toggleWishlistFromModal());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.productModal?.classList.contains('active')) {
                this.closeModal();
            }
        });
    },

    openModal(card) {
        currentProductData = utils.getProductData(card);
        
        log('🎯 Opening modal for:', currentProductData.name);
        
        // Update modal content
        if (elements.modalImage) elements.modalImage.src = currentProductData.image;
        if (elements.modalTitle) elements.modalTitle.textContent = currentProductData.name;
        if (elements.modalDescription) elements.modalDescription.textContent = currentProductData.description;
        if (elements.modalPrice) elements.modalPrice.textContent = `Rs ${utils.formatPrice(currentProductData.price)}`;
        
        const reviewCount = card.getAttribute('data-review-count');
        const reviewCountElement = card.querySelector('[data-review-count-label], .text-gray-500.text-xs');
        if (elements.modalReviews) {
            if (reviewCount) {
                elements.modalReviews.textContent = `(${reviewCount} reviews)`;
            } else if (reviewCountElement) {
                elements.modalReviews.textContent = reviewCountElement.textContent;
            }
        }
        
        if (currentProductData.originalPrice && elements.modalOriginalPrice) {
            elements.modalOriginalPrice.textContent = `Rs ${utils.formatPrice(currentProductData.originalPrice)}`;
            elements.modalOriginalPrice.classList.remove('hidden');
        } else if (elements.modalOriginalPrice) {
            elements.modalOriginalPrice.classList.add('hidden');
        }
        
        if (elements.quantityInput) elements.quantityInput.value = 1;
        
        if (elements.modalWishlistBtn) {
            utils.updateWishlistButtonState(elements.modalWishlistBtn, currentProductData.id);
        }
        
        // Update modal button state if this product is loading
        if (cartManager.loadingProducts.has(currentProductData.id) && elements.addToModalBtn) {
            elements.addToModalBtn.innerHTML = '<i class="bx bx-loader-alt animate-spin mr-2"></i> Adding...';
            elements.addToModalBtn.classList.add('opacity-70', 'cursor-wait');
            elements.addToModalBtn.disabled = true;
        } else if (elements.addToModalBtn) {
            elements.addToModalBtn.innerHTML = '<i class="bx bx-plus mr-2"></i> Add to Cart';
            elements.addToModalBtn.classList.remove('opacity-70', 'cursor-wait');
            elements.addToModalBtn.disabled = false;
        }
        
        if (elements.productModal) {
            // Attach quick review form for this product
            attachModalReviewForm(currentProductData.productId || currentProductData.id);
            elements.productModal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    },

    closeModal() {
        if (elements.productModal) {
            elements.productModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    },

    adjustQuantity(change) {
        if (!elements.quantityInput) return;
        
        let value = parseInt(elements.quantityInput.value);
        if (change === -1 && value > 1) {
            elements.quantityInput.value = value - 1;
        } else if (change === 1) {
            elements.quantityInput.value = value + 1;
        }
    },

    async addToCartFromModal() {
        if (currentProductData) {
            const quantity = elements.quantityInput ? parseInt(elements.quantityInput.value) : 1;
            log(`🎯 Adding from modal: ${currentProductData.name}, quantity: ${quantity}`);
            
            if (!window.cartAPI?.isAuthenticated()) {
                const proceed = confirm('Please login to add items to cart. Login now?');
                if (proceed) {
                    window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
                    return;
                }
            }
            
            await cartManager.addToCart(
                currentProductData.productId || currentProductData.id, 
                currentProductData.name, 
                quantity
            );
            this.closeModal();
        }
    },

    toggleWishlistFromModal() {
        if (currentProductData && elements.modalWishlistBtn) {
            wishlistManager.toggleWishlist(currentProductData.id, currentProductData);
            utils.updateWishlistButtonState(elements.modalWishlistBtn, currentProductData.id);
        }
    }
};

// Reviews manager - populates homepage carousel and provides modal review submission
const reviewsManager = {
    async init() {
        this.track = document.getElementById('reviews-track');
        if (this.track) await this.loadAndRender();
    },

    async loadAndRender() {
        try {
            const resp = await window.api.request(`${window.api.endpoints.products}/reviews/recent`);
            const reviews = resp.reviews || [];
            this.track.innerHTML = '';

            reviews.forEach(r => {
                const card = document.createElement('div');
                card.className = 'review-card';
                card.innerHTML = `
                    <div class="review-content">
                        <p class="text-sm text-gray-700">${(r.comment || '').slice(0,200)}</p>
                        <div class="mt-2 text-xs text-gray-500">— ${r.user || 'Customer'} on <strong>${r.productName}</strong></div>
                    </div>
                `;
                this.track.appendChild(card);
            });
        } catch (err) {
            console.error('Failed to load recent reviews:', err);
        }
    }
};

// Inject a small review form into the product modal when opened
const attachModalReviewForm = (productId) => {
    if (!elements.productModal) return;

    const existingForm = elements.productModal.querySelector('.modal-review-form');
    if (existingForm) {
        existingForm.remove();
    }

    const container = document.createElement('div');
    container.className = 'modal-review-form mt-4';
    container.dataset.productId = productId;
    container.innerHTML = `
        <h4 class="text-sm font-semibold mb-2">Leave a review</h4>
        <div class="flex items-center mb-2">
            <select class="review-rating" style="margin-right:8px;padding:6px;border-radius:4px;">
                <option value="5">5 — Excellent</option>
                <option value="4">4 — Very good</option>
                <option value="3">3 — Good</option>
                <option value="2">2 — Fair</option>
                <option value="1">1 — Poor</option>
            </select>
            <button class="submit-review-btn btn btn-sm">Submit</button>
        </div>
        <textarea class="review-comment" rows="3" placeholder="Write a quick note..." style="width:100%;padding:8px;border-radius:6px;border:1px solid #e5e7eb"></textarea>
    `;

    if (elements.modalDescription) {
        elements.modalDescription.insertAdjacentElement('afterend', container);
    } else {
        elements.productModal.appendChild(container);
    }

    const btn = container.querySelector('.submit-review-btn');
    btn.addEventListener('click', async () => {
        const currentUser = (window.api && window.api.getCurrentUser && window.api.getCurrentUser()) || (window.cartAPI && window.cartAPI.getCurrentUser && window.cartAPI.getCurrentUser());
        if (!currentUser && !window.cartAPI?.isAuthenticated()) {
            const go = confirm('Please login to submit a review. Login now?');
            if (go) window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
            return;
        }

        const rating = container.querySelector('.review-rating').value;
        const comment = container.querySelector('.review-comment').value.trim();
        if (!comment) return utils.showToast('Please add a short comment', 'error');

        try {
            const activeProductId = container.dataset.productId || productId;
            await window.api.request(`${window.api.endpoints.products}/${activeProductId}/reviews`, {
                method: 'POST',
                body: JSON.stringify({ rating, comment })
            });

            utils.showToast('Thanks — your review was submitted');
            // refresh reviews carousel
            if (reviewsManager.track) reviewsManager.loadAndRender();
            // update modal review count if present
            if (elements.modalReviews) {
                const current = elements.modalReviews.textContent.match(/(\d+)/);
                const v = current ? parseInt(current[1],10) + 1 : 1;
                elements.modalReviews.textContent = `(${v} reviews)`;
            }
            // disable form
            btn.disabled = true;
            btn.textContent = 'Submitted';
        } catch (err) {
            console.error('Review submit failed:', err);
            utils.showToast(err.message || 'Failed to submit review', 'error');
        }
    });
};


// Product Cards Management
const productCardsManager = {
    init() {
        this.ensureProductIds();
        this.addEventListeners();
        this.updateAllWishlistButtons();
    },

    ensureProductIds() {
        document.querySelectorAll('.product-card[data-id]').forEach(card => {
            const productId = card.getAttribute('data-id');
            if (productId && !card.hasAttribute('data-product-id')) {
                card.setAttribute('data-product-id', productId);
            }
        });
    },

    addEventListeners() {
        if (!elements.productGrid) {
            log('⚠️ No product grid found on this page');
            return;
        }
        
        const allCards = elements.productGrid.querySelectorAll('.product-card');
        
        allCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    modalManager.openModal(card);
                }
            });
            
            const addToCartBtn = card.querySelector('.add-to-cart');
            addToCartBtn?.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                const productData = utils.getProductData(card);
                log('🛒 Adding to cart:', productData.name);
                
                if (!window.cartAPI?.isAuthenticated()) {
                    const proceed = confirm('You need to login to add items to cart. Would you like to login now?');
                    if (proceed) {
                        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
                    }
                    return;
                }
                
                // Visual feedback
                addToCartBtn.classList.add('pulse');
                setTimeout(() => addToCartBtn.classList.remove('pulse'), 500);
                
                await cartManager.addToCart(productData.productId || productData.id, productData.name, 1);
            });
            
            const wishlistBtn = card.querySelector('.wishlist-btn');
            wishlistBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                const productData = utils.getProductData(card);
                wishlistManager.toggleWishlist(productData.id, productData);
                utils.updateWishlistButtonState(wishlistBtn, productData.id);
            });
            
            const img = card.querySelector('img');
            if (img) {
                img.onerror = function() {
                    console.error(`❌ Image failed to load: ${this.src}`);
                    this.src = 'https://via.placeholder.com/400x300?text=' + pageConfig.getPageName();
                };
            }
        });
    },

    updateAllWishlistButtons() {
        document.querySelectorAll('.wishlist-btn').forEach(button => {
            const card = button.closest('.product-card');
            if (card) {
                const productId = card.getAttribute('data-id');
                utils.updateWishlistButtonState(button, productId);
            }
        });
    }
};

// Smooth Scrolling
const smoothScrolling = {
    init() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }
};

// Authentication Handler
const authHandler = {
    init() {
        this.checkUrlForToken();
        
        document.addEventListener('userLoggedIn', (e) => {
            if (e.detail && e.detail.token) {
                window.cartAPI?.setToken(e.detail.token);
                cartManager.updateCartUI();
                navigation.updateAuthUI();
            }
        });
        
        document.addEventListener('userLoggedOut', () => {
            window.cartAPI?.clearToken();
            cartManager.updateCartUI();
            navigation.updateAuthUI();
        });
    },
    
    checkUrlForToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            window.history.replaceState({}, document.title, window.location.pathname);
            
            window.cartAPI?.setToken(token);
            document.dispatchEvent(new CustomEvent('userLoggedIn', { 
                detail: { token } 
            }));
            
            utils.showToast('Successfully logged in!');
        }
    }
};

// Main App Initialization
const app = {
    async init() {
        log(`🎪 Initializing Honeyed ${pageConfig.getPageName()} page...`);
        
        // Check if we're on a product page
        if (!elements.productGrid && pageConfig.detectPageType() !== 'home') {
            log('⚠️ Not a product page, skipping product initialization');
        }
        
        // Initialize modules
        navigation.init();
        wishlistManager.init();
        await cartManager.init();
        modalManager.init();
        
        // Only initialize product cards if we have a product grid
        if (elements.productGrid) {
            productCardsManager.init();
        }
        
        smoothScrolling.init();
        authHandler.init();
        // Initialize reviews (homepage carousel + modal submit)
        if (typeof reviewsManager !== 'undefined') await reviewsManager.init();
        
        // Load initial data
        wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        
        wishlistManager.updateWishlistCounts();
        if (elements.productGrid) {
            productCardsManager.updateAllWishlistButtons();
        }
        
        log(`✅ ${pageConfig.getPageName()} page initialized successfully!`);
    }
};

// Add CSS for animations
const addStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        /* Add to cart button loading state */
        .add-to-cart.loading {
            opacity: 0.7;
            cursor: wait;
            pointer-events: none;
        }
        
        .add-to-cart.loading i {
            animation: spin 0.6s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Instant feedback animation */
        @keyframes pulse-green {
            0%, 100% { background-color: #ec4899; }
            50% { background-color: #10b981; }
        }
        
        .add-to-cart.pulse {
            animation: pulse-green 0.5s ease-in-out;
        }
        
        /* Loading spinner animation */
        .animate-spin {
            animation: spin 1s linear infinite;
        }
        
        /* Toast animation fix */
        .toast.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        /* Modal button loading */
        button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        /* Cart item image */
        .cart-square-image {
            width: 45px;
            height: 45px;
            object-fit: cover;
            border-radius: 8px;
        }
        
        /* Wishlist item image */
        .wishlist-square-image {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 8px;
        }
        
        /* Cart item styling */
        .cart-item {
            transition: all 0.3s ease;
        }
        
        .cart-item:hover {
            transform: translateY(-2px);
        }
        
        .quantity-btn-small {
            transition: all 0.2s ease;
        }
        
        .quantity-btn-small:hover {
            background-color: #f3f4f6;
            transform: scale(1.1);
        }
    `;
    document.head.appendChild(style);
};

// Start everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    addStyles();
    app.init();
});

// Export for debugging
if (typeof module !== 'undefined') {
    module.exports = { app, cartManager, wishlistManager, utils, pageConfig };
}