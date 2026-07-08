// cart-api.js - UPDATED VERSION with improved sync functionality
class CartAPI {
  constructor() {
    this.baseURL = window.APP_CONFIG?.getApiUrl?.() ||
      window.APP_CONFIG?.API_BASE_URL ||
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4000'
        : 'https://honyedbakery-production-8dd9.up.railway.app');
    // Debug flag: enable verbose logs when `window.APP_CONFIG.DEBUG` is truthy
    this.DEBUG = !!(window.APP_CONFIG && window.APP_CONFIG.DEBUG);
    this.log = (...args) => { if (this.DEBUG) console.log(...args); };
    this.warn = (...args) => { if (this.DEBUG) console.warn(...args); };

    this.log('🛒 CartAPI using RAILWAY backend:', this.baseURL);

    this.token = localStorage.getItem('token');
    this.cache = {
      cart: null,
      timestamp: 0,
      ttl: 30000 // 30 seconds cache
    };
    
    // Debug logging
    this.log('🔧 CartAPI initialized:', {
      baseURL: this.baseURL,
      hasToken: !!this.token,
      tokenLength: this.token ? this.token.length : 0,
      fullCartURL: this.baseURL + '/api/cart'
    });
  }

  // ===== AUTHENTICATION METHODS =====

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('authToken') || localStorage.getItem('token');
    }
    return this.token && this.token !== 'null' && this.token !== 'undefined' ? this.token : null;
  }

  isAuthenticated() {
    const token = this.getToken();
    return !!token;
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
    localStorage.setItem('token', token);
    this.log('🔑 Token set');
    this.clearCache();
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    this.clearCache();
    this.log('🔓 Token cleared');
  }

  // ===== API REQUEST METHOD =====

  async request(endpoint, method = 'GET', data = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const startTime = performance.now();
    const requestId = Math.random().toString(36).substring(7);
    
    this.log(`🚀 [${requestId}] ${method} ${endpoint}`, data || '');
    
    try {
      // Ensure endpoint starts with /
      if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
      }
      
      const url = this.baseURL + endpoint;
      
      this.log(`🔗 [${requestId}] Full URL:`, url);
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        this.log(`🔑 [${requestId}] Token added (${token.length} chars)`);
      } else {
        this.warn(`⚠️ [${requestId}] No token found!`);
      }
      
      const options = {
        method,
        headers,
        signal: controller.signal,
        credentials: 'include'
      };
      
      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      
      const endTime = performance.now();
      this.log(`✅ [${requestId}] ${method} ${endpoint} - ${response.status} (${Math.round(endTime - startTime)}ms)`);
      
      // Get response text first
      const responseText = await response.text();
      this.log(`📥 [${requestId}] Response raw:`, responseText.substring(0, 200));
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`❌ [${requestId}] Failed to parse JSON:`, parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      if (!response.ok) {
        console.error(`❌ [${requestId}] API Error ${response.status}:`, result);
        
        if (response.status === 401) {
          this.clearToken();
          window.dispatchEvent(new CustomEvent('authExpired'));
        }
        
        throw new Error(result.message || `HTTP ${response.status}`);
      }
      
      // Save successful cart responses to localStorage
      if (endpoint.includes('/cart') && (result.success === true || result.success === 'true') && result.cart) {
        this.saveCartToLocalStorage(result.cart);
      }
      
      return result;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error(`⏱️ [${requestId}] Request timeout for ${endpoint}`);
        throw new Error('Request timeout. Please try again.');
      }
      
      console.error(`❌ [${requestId}] Request failed for ${endpoint}:`, error.message);
      throw error;
    }
  }

  // ===== CART METHODS =====

  async getCart(forceRefresh = false) {
    const now = Date.now();
    
    // Return cached cart if valid
    if (!forceRefresh && this.cache.cart && now - this.cache.timestamp < this.cache.ttl) {
      this.log('📦 Returning cached cart');
      return this.cache.cart;
    }
    
    // If not authenticated, return empty cart
    if (!this.isAuthenticated()) {
      this.log('🔓 Not authenticated, returning empty cart');
      const emptyCart = this.getEmptyCart();
      this.cache.cart = emptyCart;
      this.cache.timestamp = now;
      return emptyCart;
    }
    
    this.log('🔄 Fetching cart from backend...');
    
    try {
      const result = await this.request('/api/cart', 'GET');
      
      this.log('📦 Raw cart response:', result);
      
      let cartData;
      
      if ((result.success === true || result.success === 'true') && result.cart) {
        cartData = result.cart;
      } else if (result.cart) {
        cartData = result.cart;
      } else {
        cartData = this.getEmptyCart();
      }
      
      // Normalize cart structure
      const normalizedCart = this.normalizeCart(cartData);
      
      // Cache the normalized cart
      this.cache.cart = normalizedCart;
      this.cache.timestamp = now;
      
      this.log(`🛍️ Cart loaded successfully: ${normalizedCart.items.length} items`);
      
      // Save to localStorage
      this.saveCartToLocalStorage(normalizedCart);
      
      return normalizedCart;
      
    } catch (error) {
      console.error('❌ Failed to load cart:', error.message);
      
      // Try to load from localStorage
      const savedCart = this.getCartFromLocalStorage();
      if (savedCart) {
        this.log('📦 Loaded cart from localStorage');
        this.cache.cart = savedCart;
        this.cache.timestamp = now;
        return savedCart;
      }
      
      // If error is 401 (unauthorized), clear token
      if (error.message.includes('401')) {
        this.clearToken();
      }
      
      // Return empty cart on error
      const emptyCart = this.getEmptyCart();
      this.cache.cart = emptyCart;
      this.cache.timestamp = now;
      return emptyCart;
    }
  }

  async addToCart(productId, quantity = 1, productName = null) {
    this.log('➕ Adding to cart:', { productId, quantity });
    
    // Send loading event
    this.emitLoading(productId, true);
    
    // Check authentication
    if (!this.isAuthenticated()) {
      this.emitLoading(productId, false);
      return {
        success: false,
        requiresLogin: true,
        message: 'Please login to add items to cart'
      };
    }
    
    try {
      this.log('🔐 User is authenticated, token exists');
      
      // Get current cart first
      const currentCart = this.cache.cart || await this.getCart();
      
      // Create optimistic update
      const optimisticCart = this.createOptimisticCart(currentCart, productId, quantity, productName);
      
      // Update cache immediately
      this.cache.cart = optimisticCart;
      this.cache.timestamp = Date.now();
      
      // Save to localStorage
      this.saveCartToLocalStorage(optimisticCart);
      
      // Update UI immediately
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cart: optimisticCart } 
      }));
      
      // Make API request
      this.log('📤 Sending to backend API:', { productId, quantity });
      const result = await this.request('/api/cart', 'POST', {
        productId, 
        quantity 
      });
      
      this.log('📥 Backend response:', result);
      
      this.emitLoading(productId, false);
      
      // Handle API response
      if (result.success === true || result.success === 'true' || result.cart) {
        // Get fresh cart data from API response
        const freshCart = result.cart || result.data || result;
        const normalizedCart = this.normalizeCart(freshCart);
        
        // Update cache with real data
        this.cache.cart = normalizedCart;
        this.cache.timestamp = Date.now();
        
        // Save to localStorage
        this.saveCartToLocalStorage(normalizedCart);
        
        // Update UI with real data
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
          detail: { cart: normalizedCart } 
        }));
        
        return {
          success: true,
          message: result.message || 'Added to cart!',
          cart: normalizedCart
        };
      } else {
        // API call succeeded but returned error
        console.warn('API returned error:', result.message);
        
        // Keep optimistic update but show message
        return {
          success: false,
          message: result.message || 'Failed to add to cart',
          cart: optimisticCart
        };
      }
      
    } catch (error) {
      this.emitLoading(productId, false);
      
      console.error('❌ Add to cart failed:', error.message);
      console.error('Error details:', error);
      
      // If auth error, clear token
      if (error.message.includes('401')) {
        this.clearToken();
        return {
          success: false,
          requiresLogin: true,
          message: 'Please login again'
        };
      }
      
      // For other errors, keep optimistic update
      return {
        success: true, // Show success to user
        message: 'Added to cart!',
        cart: this.cache.cart
      };
    }
  }

  async updateCartItem(itemId, quantity) {
    this.log('✏️ Updating cart item:', { itemId, quantity });
    
    try {
      const result = await this.request(`/api/cart/${itemId}`, 'PUT', { quantity });
      
      if (result.success === true || result.success === 'true') {
        // Clear cache to force refresh
        this.clearCache();
        await this.getCart(true);
      }
      
      return result;
      
    } catch (error) {
      console.error('Update cart item error:', error);
      return { success: false, message: error.message };
    }
  }

  async removeFromCart(itemId) {
    this.log('🗑️ Removing cart item:', itemId);
    
    try {
      const result = await this.request(`/api/cart/${itemId}`, 'DELETE');
      
      if (result.success === true || result.success === 'true') {
        // Clear cache to force refresh
        this.clearCache();
        await this.getCart(true);
      }
      
      return result;
      
    } catch (error) {
      console.error('Remove from cart error:', error);
      return { success: false, message: error.message };
    }
  }

  async clearCart() {
    this.log('🗑️ Clearing cart...');
    
    try {
      const result = await this.request('/api/cart', 'DELETE');
      
      if (result.success === true || result.success === 'true') {
        this.cache.cart = this.getEmptyCart();
        this.cache.timestamp = Date.now();
        localStorage.removeItem('honeyed-cart');
        
        // Update UI
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
          detail: { cart: this.cache.cart } 
        }));
        
        this.log('✅ Cart cleared');
        return result;
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      // Even if backend fails, clear local cache
      this.cache.cart = this.getEmptyCart();
      this.cache.timestamp = Date.now();
      localStorage.removeItem('honeyed-cart');
      
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cart: this.cache.cart } 
      }));
      
      return { success: true, message: 'Cart cleared locally' };
    }
  }

  // ===== SYNC METHOD =====
  // cart-api.js - Replace syncCartWithBackend function (around line 417)

async syncCartWithBackend(frontendCart) {
  this.log('🔄 Syncing frontend cart with backend...');
  this.log('📦 Frontend cart to sync:', JSON.stringify(frontendCart, null, 2));
  
  // Check authentication
  if (!this.isAuthenticated()) {
    console.warn('⚠️ Not authenticated, cannot sync cart');
    return {
      success: false,
      requiresLogin: true,
      message: 'Please login to sync cart'
    };
  }
  
  // If cart is empty, nothing to sync
  if (!frontendCart || !frontendCart.items || frontendCart.items.length === 0) {
    this.log('📭 Cart is empty, nothing to sync');
    return { success: true, cart: frontendCart, message: 'Cart is empty' };
  }
  
  try {
    // Clear backend cart first, then add items one by one
    this.log('🧹 Clearing backend cart before sync...');
    // Backend exposes DELETE /api/cart to clear the cart
    await this.request('/api/cart', 'DELETE');
    
    // Add each item to backend cart
    for (const item of frontendCart.items) {
      const productId = item.productId || item.product?._id;
      const quantity = item.quantity || 1;
      
      if (productId) {
        this.log(`➕ Adding to backend: ${productId} x ${quantity}`);
        await this.request('/api/cart', 'POST', {
          productId: productId,
          quantity: quantity
        });
      }
    }
    
    // Clear cache and get fresh cart
    this.clearCache();
    const freshCart = await this.getCart(true);
    
    this.log('✅ Cart synced successfully:', freshCart);
    
    return {
      success: true,
      message: 'Cart synced successfully',
      cart: freshCart
    };
    
  } catch (error) {
    console.error('❌ Sync cart failed:', error);
    return {
      success: false,
      message: error.message || 'Failed to sync cart',
      cart: frontendCart
    };
  }
}


  // ===== ORDER METHODS =====

  async createOrder(orderData) {
    this.log('💳 Creating order with data:', orderData);
    
    if (!this.isAuthenticated()) {
      return {
        success: false,
        requiresLogin: true,
        message: 'Please login to place an order'
      };
    }
    
    try {
      // Create order directly — DO NOT sync/clear cart here.
      // The checkout page sends cart items in the order body already.
      const result = await this.request('/api/orders', 'POST', orderData);
      
      this.log('✅ Order response:', result);
      
      // Only clear cart AFTER a confirmed successful order
      if (result.success === true || result.success === 'true') {
        await this.clearCart();
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Order creation failed:', error.message);
      
      if (error.message.includes('401')) {
        this.clearToken();
        return {
          success: false,
          requiresLogin: true,
          message: 'Please login again'
        };
      }
      
      return {
        success: false,
        message: error.message || 'Failed to create order'
      };
    }
  }

  // ===== HELPER METHODS =====

  createOptimisticCart(currentCart, productId, quantity, productName) {
    const optimisticCart = JSON.parse(JSON.stringify(currentCart));
    
    // Check if product already in cart
    const existingItem = optimisticCart.items?.find(item => 
      item.product?._id === productId || item.productId === productId
    );
    
    if (existingItem) {
      // Update quantity
      existingItem.quantity += quantity;
      if (existingItem.price) {
        existingItem.itemTotal = existingItem.price * existingItem.quantity;
      }
    } else {
      // Add new item
      optimisticCart.items.push({
        _id: `temp_${Date.now()}`,
        product: {
          _id: productId,
          name: productName || 'Product',
          image: 'https://via.placeholder.com/45x45?text=Product'
        },
        productId: productId,
        quantity: quantity,
        price: 0,
        itemTotal: 0
      });
    }
    
    // Recalculate totals
    optimisticCart.itemCount = optimisticCart.items.reduce((sum, item) => sum + item.quantity, 0);
    optimisticCart.subtotal = optimisticCart.items.reduce((sum, item) => sum + (item.itemTotal || 0), 0);
    optimisticCart.shipping = optimisticCart.subtotal > 2000 ? 0 : 200;
    optimisticCart.tax = optimisticCart.subtotal * 0.05;
    optimisticCart.total = optimisticCart.subtotal + optimisticCart.shipping + optimisticCart.tax;
    
    return optimisticCart;
  }

  normalizeCart(cartData) {
    const resolveImageUrl = (imageValue) => {
      if (!imageValue) {
        return 'https://via.placeholder.com/45x45?text=Product';
      }

      if (typeof imageValue === 'string') {
        return imageValue;
      }

      if (Array.isArray(imageValue)) {
        const firstImage = imageValue[0];
        if (typeof firstImage === 'string') {
          return firstImage;
        }
        return firstImage?.url || 'https://via.placeholder.com/45x45?text=Product';
      }

      return imageValue.url || imageValue.src || 'https://via.placeholder.com/45x45?text=Product';
    };

    // Ensure cart has required properties
    const normalized = {
      items: cartData.items || cartData.cartItems || [],
      subtotal: cartData.subtotal || 0,
      tax: cartData.tax || 0,
      shipping: cartData.shipping || 200,
      total: cartData.total || 200,
      itemCount: 0
    };
    
    // Calculate itemCount
    normalized.itemCount = normalized.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    // Ensure each item has required properties
    normalized.items = normalized.items.map(item => ({
      _id: item._id || item.id || `item_${Date.now()}`,
      product: item.product || { 
        _id: item.productId, 
        name: item.name || 'Product',
        image: resolveImageUrl(item.image || item.product?.image || item.product?.images)
      },
      productId: item.productId || item.product?._id,
      quantity: item.quantity || 1,
      price: item.price || 0,
      itemTotal: item.itemTotal || (item.price || 0) * (item.quantity || 1)
    }));
    
    // Recalculate totals if missing
    if (!cartData.subtotal || !cartData.total) {
      normalized.subtotal = normalized.items.reduce((sum, item) => sum + (item.itemTotal || 0), 0);
      normalized.shipping = normalized.subtotal > 2000 ? 0 : 200;
      normalized.tax = normalized.subtotal * 0.05;
      normalized.total = normalized.subtotal + normalized.shipping + normalized.tax;
    }
    
    return normalized;
  }

  getEmptyCart() {
    return {
      items: [],
      subtotal: 0,
      tax: 0,
      shipping: 200,
      total: 200,
      itemCount: 0
    };
  }

  saveCartToLocalStorage(cart) {
    try {
      localStorage.setItem('honeyed-cart', JSON.stringify(cart));
      this.log('💾 Cart saved to localStorage');
    } catch (error) {
      console.warn('⚠️ Could not save cart to localStorage:', error);
    }
  }

  getCartFromLocalStorage() {
    try {
      const savedCart = localStorage.getItem('honeyed-cart');
      if (savedCart) {
        return JSON.parse(savedCart);
      }
    } catch (error) {
      console.warn('⚠️ Could not load cart from localStorage:', error);
    }
    return null;
  }

  emitLoading(productId, loading) {
    setTimeout(() => {
      const event = new CustomEvent('cartLoading', { 
        detail: { productId, loading } 
      });
      document.dispatchEvent(event);
    }, 0);
  }

  clearCache() {
    this.cache.cart = null;
    this.cache.timestamp = 0;
    this.log('🧹 Cache cleared');
  }

  // Test connection to backend
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      return {
        success: response.ok,
        status: response.status,
        url: this.baseURL
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        url: this.baseURL
      };
    }
  }
}

// Create global instance
window.cartAPI = new CartAPI();

// Debug logging
if (window.cartAPI) {
  window.cartAPI.log && window.cartAPI.log('🛒 CartAPI loaded:', {
    baseURL: window.cartAPI.baseURL,
    isAuthenticated: window.cartAPI.isAuthenticated(),
    syncAvailable: typeof window.cartAPI.syncCartWithBackend === 'function'
  });
}

// Listen for cart updates
window.addEventListener('cartUpdated', (event) => {
  if (window.cartAPI && window.cartAPI.log) window.cartAPI.log('🔄 Cart updated:', event.detail?.cart?.itemCount || 0, 'items');
});