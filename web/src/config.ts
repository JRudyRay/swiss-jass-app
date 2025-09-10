// Environment configuration
const isDevelopment = typeof location !== 'undefined' && location.hostname === 'localhost';

// Your Railway backend URL
const PRODUCTION_API_URL = 'https://swiss-jass-app-production.up.railway.app';
const DEVELOPMENT_API_URL = 'http://localhost:3000';

export const API_URL = isDevelopment ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;

console.log('API_URL configured as:', API_URL);
