// Environment configuration
const isDevelopment = typeof location !== 'undefined' && location.hostname === 'localhost';
const isGitHubPages = typeof location !== 'undefined' && location.hostname.includes('github.io');

// Your Raspberry Pi backend URL
const PI_API_URL = 'http://192.168.1.141:3000';
const DEVELOPMENT_API_URL = 'http://localhost:3000';

// For GitHub Pages, we'll need to use your Pi's IP
// Note: This requires HTTPS on Pi or allowing mixed content in browser
let API_URL: string;

if (typeof window !== 'undefined' && window.location.hostname === 'jrudyray.github.io') {
  // Production on GitHub Pages - connecting to Raspberry Pi backend via HTTPS
  API_URL = 'https://192.168.1.141';
} else {
  // Local development
  API_URL = 'http://localhost:3000';
}

console.log('API_URL configured as:', API_URL);
console.log('Environment:', isDevelopment ? 'Development' : 'Production (Pi backend)');
console.log('GitHub Pages deployment detected:', isGitHubPages);

// Warning for mixed content
if (isGitHubPages && PI_API_URL.startsWith('http:')) {
  console.warn('⚠️  Mixed Content Warning: HTTPS frontend trying to connect to HTTP backend');
  console.warn('💡 Solutions:');
  console.warn('   1. Test locally: npm run dev');
  console.warn('   2. Set up HTTPS on your Pi');
  console.warn('   3. Allow insecure content in browser settings');
}
