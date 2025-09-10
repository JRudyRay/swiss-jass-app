// Environment configuration
const isDevelopment = typeof location !== 'undefined' && location.hostname === 'localhost';

// Replace this with your actual Railway URL
const PRODUCTION_API_URL = 'https://YOUR_RAILWAY_URL_HERE.up.railway.app';
const DEVELOPMENT_API_URL = 'http://localhost:3000';

export const API_URL = isDevelopment ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;

console.log('API_URL configured as:', API_URL);
