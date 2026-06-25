// auth.js - FIXED Enhanced Authentication Functions

(function() {
    'use strict';

    const DEBUG = !!(window.APP_CONFIG && window.APP_CONFIG.DEBUG);
    const log = (...args) => { if (DEBUG) console.log(...args); };

    // ==================== State Management ====================
    
    function isLoggedIn() {
        return !!(localStorage.getItem('authToken') || localStorage.getItem('token'));
    }

    function getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    function isAdmin() {
        const user = getCurrentUser();
        return user && user.role === 'admin';
    }

    // ==================== UI Update ====================
    
    function updateAuthUI() {
        const user = getCurrentUser();
        const isAuth = isLoggedIn();

        log('Updating Auth UI - User:', user, 'IsAuth:', isAuth);

        // Update all profile toggles
        const profileToggles = [
            document.getElementById('profile-toggle'),
            document.getElementById('desktop-profile-toggle')
        ];
        
        profileToggles.forEach(toggle => {
            if (toggle) {
                if (isAuth && user) {
                    const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
                    const userAvatar = `<div class="user-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #FFB6C1, #FF69B4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">${userInitial}</div>`;
                    
                    if (toggle.id === 'profile-toggle') {
                        toggle.innerHTML = userAvatar;
                    } else {
                        toggle.innerHTML = `<i class='bx bx-user-circle'></i><span>${user.name}</span>`;
                    }
                } else {
                    if (toggle.id === 'profile-toggle') {
                        toggle.innerHTML = '<i class="bx bx-user-circle"></i>';
                    } else {
                        toggle.innerHTML = '<i class="bx bx-user-circle"></i><span>Login</span>';
                    }
                }
            }
        });

        updateAdminLinks();
    }

    function updateAdminLinks() {
        const adminLinks = document.querySelectorAll('.admin-only');
        const isAdminUser = isAdmin();

        adminLinks.forEach(link => {
            link.style.display = isAdminUser ? 'block' : 'none';
        });
    }

    // ==================== Login ====================
    
    async function handleLogin(email, password) {
        try {
            const submitBtn = document.getElementById('login-submit');
            if (submitBtn) {
                submitBtn.textContent = 'Logging in...';
                submitBtn.disabled = true;
            }

            log('Attempting login for:', email);
            const response = await api.login({ email, password });

            log('Login response:', response);

            if (response.success && response.user) {
                log('Login successful. User role:', response.user.role);
                
                updateAuthUI();
                showNotification('Login successful! Welcome back.', 'success');
                closeLoginModal();

                // Redirect admin users to home (admin panel not yet available)
                if (response.user.role === 'admin') {
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    setTimeout(() => {
                        // Refresh page to update UI
                        window.location.reload();
                    }, 1000);
                }

                return true;
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification(error.message || 'Login failed. Please try again.', 'error');
            return false;
        } finally {
            const submitBtn = document.getElementById('login-submit');
            if (submitBtn) {
                submitBtn.textContent = 'Login';
                submitBtn.disabled = false;
            }
        }
    }

    // ==================== Register ====================
    
    async function handleRegister(name, email, password, confirmPassword) {
        try {
            // Validation
            if (!name || !email || !password || !confirmPassword) {
                throw new Error('All fields are required');
            }

            if (name.length < 2) {
                throw new Error('Name must be at least 2 characters');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Please enter a valid email address');
            }

            const submitBtn = document.getElementById('register-submit');
            if (submitBtn) {
                submitBtn.textContent = 'Creating Account...';
                submitBtn.disabled = true;
            }

            log('Registering user:', { name, email });
            const response = await api.register({ name, email, password });

            log('Registration response:', response);

            if (response.success) {
                // Show email verification message
                showNotification('Account created! Please check your email to verify your account.', 'success');
                closeLoginModal();
                
                // Clear form
                const form = document.getElementById('register-form');
                if (form) form.reset();

                return true;
            } else {
                throw new Error(response.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            
            let errorMessage = 'Registration failed. ';
            
            if (error.message.includes('already exists') || error.message.includes('User already exists')) {
                errorMessage = 'This email is already registered. Please login instead.';
            } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to server. Please check your connection.';
            } else {
                errorMessage = error.message || 'Please try again.';
            }
            
            showNotification(errorMessage, 'error');
            return false;
        } finally {
            const submitBtn = document.getElementById('register-submit');
            if (submitBtn) {
                submitBtn.textContent = 'Create Account';
                submitBtn.disabled = false;
            }
        }
    }

    // ==================== Logout ====================
    
    function handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            api.logout();
            showNotification('Logged out successfully', 'success');
            updateAuthUI();
            
            // Redirect if on protected page
            const protectedPages = ['admin', 'profile', 'orders', 'checkout'];
            const currentPath = window.location.pathname;
            
            if (protectedPages.some(page => currentPath.includes(page))) {
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                // Just reload the page
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        }
    }

    // ==================== Notifications ====================
    
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="bx ${type === 'success' ? 'bx-check-circle' : type === 'error' ? 'bx-error-circle' : 'bx-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles if not present
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 10000;
                    animation: slideIn 0.3s ease;
                    max-width: 400px;
                }
                
                .notification-success { background: #4caf50; color: white; }
                .notification-error { background: #f44336; color: white; }
                .notification-info { background: #2196F3; color: white; }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .notification-content i { font-size: 24px; }
                
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ==================== Modal Functions ====================
    
    function closeLoginModal() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.remove('active');
        }
    }

    // ==================== Profile Menu ====================
    
    function showProfileMenu(e) {
        const existingMenu = document.getElementById('profile-dropdown');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const user = getCurrentUser();
        if (!user) return;

        const menu = document.createElement('div');
        menu.id = 'profile-dropdown';
        menu.className = 'profile-dropdown';
        menu.innerHTML = `
            <div class="profile-dropdown-header">
                <div class="profile-avatar">${user.name.charAt(0).toUpperCase()}</div>
                <div>
                    <div class="profile-name">${user.name}</div>
                    <div class="profile-email">${user.email}</div>
                </div>
            </div>
            <div class="profile-dropdown-divider"></div>
            ${user.role === 'admin' ? '<a href="admin.html" class="profile-dropdown-item"><i class="bx bx-shield"></i> Admin Panel</a>' : ''}
            <a href="#" class="profile-dropdown-item" id="profile-orders"><i class="bx bx-shopping-bag"></i> My Orders</a>
            <a href="#" class="profile-dropdown-item" id="logout-link"><i class="bx bx-log-out"></i> Logout</a>
        `;

        // Add styles
        if (!document.getElementById('profile-dropdown-styles')) {
            const style = document.createElement('style');
            style.id = 'profile-dropdown-styles';
            style.textContent = `
                .profile-dropdown {
                    position: fixed;
                    top: 70px;
                    right: 20px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    min-width: 250px;
                    z-index: 1000;
                    animation: fadeIn 0.2s ease;
                }
                
                .profile-dropdown-header {
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .profile-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #FFB6C1, #FF69B4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 20px;
                    font-weight: bold;
                }
                
                .profile-name {
                    font-weight: 600;
                    color: #333;
                    font-size: 16px;
                }
                
                .profile-email {
                    color: #666;
                    font-size: 13px;
                }
                
                .profile-dropdown-divider {
                    height: 1px;
                    background: #e0e0e0;
                    margin: 0 15px;
                }
                
                .profile-dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 20px;
                    color: #333;
                    text-decoration: none;
                    transition: background 0.2s;
                }
                
                .profile-dropdown-item:hover {
                    background: #f5f5f5;
                }
                
                .profile-dropdown-item i {
                    font-size: 20px;
                    color: #666;
                }
                
                .profile-dropdown-item:last-child {
                    border-radius: 0 0 12px 12px;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(menu);

        // Event listeners
        document.getElementById('logout-link').addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
            menu.remove();
        });

        const ordersLink = document.getElementById('profile-orders');
        if (ordersLink) {
            ordersLink.addEventListener('click', (e) => {
                e.preventDefault();
                showNotification('Orders page coming soon!', 'info');
                menu.remove();
            });
        }

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && 
                    !e.target.closest('#profile-toggle') && 
                    !e.target.closest('#desktop-profile-toggle')) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    // ==================== Initialize ====================
    
    function initializeAuth() {
        log('Initializing auth system...');

        // Check if user is logged in on page load
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const user = getCurrentUser();
        
        if (token && user) {
            log('User is logged in:', user.name, '- Role:', user.role);
            updateAuthUI();
        } else {
            log('No user logged in');
        }

        // Login submit
        const loginSubmit = document.getElementById('login-submit');
        if (loginSubmit) {
            loginSubmit.addEventListener('click', (e) => {
                e.preventDefault();
                
                const email = document.getElementById('login-email')?.value.trim();
                const password = document.getElementById('login-password')?.value;

                if (!email || !password) {
                    showNotification('Please enter email and password', 'error');
                    return;
                }

                handleLogin(email, password);
            });
        }

        // Register submit
        const registerSubmit = document.getElementById('register-submit');
        if (registerSubmit) {
            registerSubmit.addEventListener('click', (e) => {
                e.preventDefault();
                
                const name = document.getElementById('register-name')?.value.trim();
                const email = document.getElementById('register-email')?.value.trim();
                const password = document.getElementById('register-password')?.value;
                const confirmPassword = document.getElementById('register-confirm')?.value;

                handleRegister(name, email, password, confirmPassword);
            });
        }

        // Enter key support for login
        const loginEmail = document.getElementById('login-email');
        const loginPassword = document.getElementById('login-password');
        
        if (loginEmail && loginPassword) {
            [loginEmail, loginPassword].forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        loginSubmit?.click();
                    }
                });
            });
        }

        // Enter key support for register
        const registerInputs = [
            document.getElementById('register-name'),
            document.getElementById('register-email'),
            document.getElementById('register-password'),
            document.getElementById('register-confirm')
        ];

        registerInputs.forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        registerSubmit?.click();
                    }
                });
            }
        });

        // Profile toggle handlers
        const profileToggle = document.getElementById('profile-toggle');
        const desktopProfileToggle = document.getElementById('desktop-profile-toggle');
        
        if (profileToggle) {
            profileToggle.addEventListener('click', (e) => {
                e.preventDefault();
                if (isLoggedIn()) {
                    showProfileMenu(e);
                } else {
                    window.location.href = 'login.html';
                }
            });
        }
        
        if (desktopProfileToggle) {
            desktopProfileToggle.addEventListener('click', (e) => {
                e.preventDefault();
                if (isLoggedIn()) {
                    showProfileMenu(e);
                } else {
                    window.location.href = 'login.html';
                }
            });
        }

        log('Auth system initialized ✓');
    }

    // ==================== Export ====================
    
    window.authManager = {
        isLoggedIn,
        getCurrentUser,
        isAdmin,
        handleLogin,
        handleRegister,
        handleLogout,
        updateAuthUI,
        showNotification
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAuth);
    } else {
        initializeAuth();
    }

})();