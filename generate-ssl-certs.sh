#!/bin/bash

# This script generates self-signed SSL certificates for local development/testing
# For production use, you should obtain proper SSL certificates from Let's Encrypt or a CA

echo "Generating self-signed SSL certificates for local development..."

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

# Generate private key
openssl genrsa -out nginx/ssl/privkey.pem 2048

# Generate certificate signing request
openssl req -new -key nginx/ssl/privkey.pem -out nginx/ssl/cert.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=192.168.1.141"

# Generate self-signed certificate (valid for 365 days)
openssl x509 -req -in nginx/ssl/cert.csr -signkey nginx/ssl/privkey.pem -out nginx/ssl/fullchain.pem -days 365

# Clean up CSR file
rm nginx/ssl/cert.csr

echo "Self-signed SSL certificates generated successfully!"
echo "Note: Your browser will show a security warning for self-signed certificates."
echo "You'll need to accept the certificate to proceed."
echo ""
echo "Files created:"
echo "- nginx/ssl/privkey.pem (private key)"
echo "- nginx/ssl/fullchain.pem (certificate)"