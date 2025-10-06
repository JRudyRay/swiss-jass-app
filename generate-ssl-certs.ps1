# For PowerShell on Windows
# This script generates self-signed SSL certificates for local development/testing

Write-Host "Generating self-signed SSL certificates for local development..." -ForegroundColor Green

# Create SSL directory if it doesn't exist
if (!(Test-Path "nginx\ssl")) {
    New-Item -ItemType Directory -Path "nginx\ssl" -Force
}

# Generate private key
& openssl genrsa -out nginx\ssl\privkey.pem 2048

# Generate certificate signing request
& openssl req -new -key nginx\ssl\privkey.pem -out nginx\ssl\cert.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=192.168.1.141"

# Generate self-signed certificate (valid for 365 days)
& openssl x509 -req -in nginx\ssl\cert.csr -signkey nginx\ssl\privkey.pem -out nginx\ssl\fullchain.pem -days 365

# Clean up CSR file
Remove-Item nginx\ssl\cert.csr -Force

Write-Host "Self-signed SSL certificates generated successfully!" -ForegroundColor Green
Write-Host "Note: Your browser will show a security warning for self-signed certificates." -ForegroundColor Yellow
Write-Host "You'll need to accept the certificate to proceed." -ForegroundColor Yellow
Write-Host ""
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "- nginx/ssl/privkey.pem (private key)" -ForegroundColor White
Write-Host "- nginx/ssl/fullchain.pem (certificate)" -ForegroundColor White