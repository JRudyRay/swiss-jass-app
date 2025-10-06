// Environment configuration
let API_URL: string;

if (typeof window !== 'undefined' && window.location.hostname === 'jrudyray.github.io') {
  // Production on GitHub Pages - connecting to Raspberry Pi backend via HTTPS
  API_URL = 'https://192.168.1.141';
} else {
  // Local development
  API_URL = 'http://localhost:3000';
}

console.log('🇨🇭 Swiss Jass - API configured:', API_URL);

export { API_URL };
