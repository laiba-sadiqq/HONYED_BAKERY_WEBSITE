// config.js - SIMPLE VERSION
const APP_CONFIG = {
  // Production backend WITHOUT /api
  API_BASE_URL: 'https://honyedbakerywebsite-production.up.railway.app',
  
  // Local development
  API_BASE_URL_LOCAL: 'http://localhost:4000',
  
  getApiUrl() {
    // Check if we're on localhost
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1') {
      return this.API_BASE_URL_LOCAL;
    }
    return this.API_BASE_URL;
  }
};

window.APP_CONFIG = APP_CONFIG;
window.CONFIG = APP_CONFIG;

if (APP_CONFIG.DEBUG) console.log('🔗 Using API URL:', APP_CONFIG.getApiUrl());