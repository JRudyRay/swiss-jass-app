// Environment configuration
const isDevelopment = typeof location !== 'undefined' && location.hostname === 'localhost';

// Your Raspberry Pi backend URL - REPLACE WITH YOUR ACTUAL PI IP
const PRODUCTION_API_URL = 'http://192.168.1.100:3000';  // Change this to your Pi's IP
const DEVELOPMENT_API_URL = 'http://localhost:3000';

export const API_URL = isDevelopment ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;

console.log('API_URL configured as:', API_URL);
console.log('Running on Raspberry Pi backend');
