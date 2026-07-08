// config.js - SIMPLE VERSION
const APP_CONFIG = {
  // Production backend
  API_BASE_URL: 'https://honyedbakerywebsite-production.up.railway.app',

  // Local development
  API_BASE_URL_LOCAL: 'http://localhost:4000',

  getApiUrl() {
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      return this.API_BASE_URL_LOCAL;
    }
    return this.API_BASE_URL;
  }
};

window.APP_CONFIG = APP_CONFIG;
window.CONFIG = APP_CONFIG;

console.log('🔗 Using API URL:', APP_CONFIG.getApiUrl());