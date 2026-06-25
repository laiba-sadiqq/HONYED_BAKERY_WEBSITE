// api.js - API Service Layer (FIXED VERSION)
class ApiService {
    constructor() {
        // Use the config from config.js
        this.baseURL = window.APP_CONFIG?.getApiUrl?.() ||
                      window.APP_CONFIG?.API_BASE_URL ||
                      'http://localhost:4000';
                
        this.token = localStorage.getItem('authToken');
        // Debug logging controlled by window.APP_CONFIG.DEBUG
        this.DEBUG = !!(window.APP_CONFIG && window.APP_CONFIG.DEBUG);
        this.log = (...args) => { if (this.DEBUG) console.log(...args); };
        this.warn = (...args) => { if (this.DEBUG) console.warn(...args); };
        this.log('🔗 Using API URL:', this.baseURL);
        
        // Define API endpoints relative to baseURL
        this.endpoints = {
            auth: {
                login: '/api/auth/login',
                register: '/api/auth/register',
                me: '/api/auth/me'
            },
            products: '/api/products',
            cart: '/api/cart',
            orders: '/api/orders',
            admin: '/api/admin'
        };
    }

    // Set authorization token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
        localStorage.setItem('token', token);
    }

    // Remove token (logout)
    removeToken() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    // Get current user from localStorage
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if available
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            this.log(`API Request: ${url}`, options);
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include'
            });

            const data = await response.json();
            
            if (!response.ok) {
                console.error(`API Error (${response.status}):`, data);
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            this.log(`API Response (${url}):`, data);
            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

  
// Replace the login method in api.js with this:
async login(credentials) {
    const response = await this.request(this.endpoints.auth.login, {
        method: 'POST',
        body: JSON.stringify(credentials)
    });
    
    // Check if response has token and success properties
    if (response.token) {
        this.setToken(response.token);
        const user = response.user || response.data;
        if (user) {
            localStorage.setItem('user', JSON.stringify({
                id: user.id || user._id,
                _id: user.id || user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }));
        }
        return { 
            success: true, 
            token: response.token, 
            user,
            message: response.message || 'Login successful'
        };
    }
    
    return response; // Return as-is if it already has success property
}
    async register(userData) {
        return this.request(this.endpoints.auth.register, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async getMe() {
        const data = await this.request(this.endpoints.auth.me);
        
        // Store user in localStorage
        if (data.success && (data.user || data.data)) {
            localStorage.setItem('user', JSON.stringify(data.user || data.data));
        }
        
        return data;
    }

    async logout() {
        this.removeToken();
        return { success: true, message: 'Logged out' };
    }

    // Product endpoints
    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${this.endpoints.products}?${queryString}` : this.endpoints.products;
        return this.request(url);
    }

    async getProduct(id) {
        return this.request(`${this.endpoints.products}/${id}`);
    }

    async deleteProduct(id) {
        return this.request(`${this.endpoints.products}/${id}`, {
            method: 'DELETE'
        });
    }

    // Cart endpoints
    async getCart() {
        return this.request(this.endpoints.cart);
    }

    async addToCart(product) {
        return this.request(this.endpoints.cart, {
            method: 'POST',
            body: JSON.stringify(product)
        });
    }

    async removeFromCart(id) {
        return this.request(`${this.endpoints.cart}/${id}`, {
            method: 'DELETE'
        });
    }

    // Order endpoints
    async createOrder(order) {
        return this.request(this.endpoints.orders, {
            method: 'POST',
            body: JSON.stringify(order)
        });
    }

    async getOrders() {
        return this.request(this.endpoints.orders);
    }

    async getAllOrders(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${this.endpoints.orders}?${queryString}` : this.endpoints.orders;
        return this.request(url);
    }

    async updateOrderStatus(orderId, status, note = '') {
        return this.request(`${this.endpoints.orders}/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, note })
        });
    }

    // Admin endpoints (only for admin users)
    async getAdminStats() {
        return this.request(`${this.endpoints.admin}/stats`);
    }

    async getAllUsers() {
        return this.request(`${this.endpoints.admin}/users`);
    }

    async updateUserRole(userId, role) {
        return this.request(`${this.endpoints.admin}/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        });
    }

    async deleteUser(userId) {
        return this.request(`${this.endpoints.admin}/users/${userId}`, {
            method: 'DELETE'
        });
    }
}

// Create and export singleton instance
const api = new ApiService();

// For browser use
window.api = api;

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}