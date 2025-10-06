# 🚀 Swiss Jass - Deployment Guide

## 🏠 Raspberry Pi HTTPS Deployment

Your Swiss Jass app is deployed on a Raspberry Pi with HTTPS using self-signed certificates.

### 📦 Architecture

```
GitHub Pages (Frontend)
    ↓ HTTPS
Raspberry Pi (Backend)
    ├── Nginx (SSL Termination, Port 443)
    └── Node.js Backend (Port 3000 internal)
```

### 🔧 Deployment Setup

**Prerequisites:**
- Raspberry Pi with Docker and Docker Compose installed
- GitHub Actions self-hosted runner configured
- SSL certificates generated

**Automatic Deployment:**
1. Push to `main` branch
2. GitHub Actions triggers on the self-hosted runner
3. Docker containers rebuild and restart automatically

### 📝 Manual Deployment Commands

On your Raspberry Pi:

```bash
cd ~/swiss-jass-app

# Pull latest changes
git pull origin main

# Stop containers
docker compose -f docker-compose.ssl.yml down

# Rebuild and start
docker compose -f docker-compose.ssl.yml up -d --build

# View logs
docker compose -f docker-compose.ssl.yml logs -f
```

### 🔒 SSL Certificates

Self-signed certificates are used for local network HTTPS:

```bash
# Regenerate certificates (if needed)
bash generate-ssl-certs.sh

# Restart nginx to load new certificates
docker compose -f docker-compose.ssl.yml restart nginx
```

### 🌐 Access Points

- **Frontend:** https://jrudyray.github.io/swiss-jass-app/
- **Backend API:** https://192.168.1.141
- **Health Check:** https://192.168.1.141/health

### 🐛 Troubleshooting

**Check container status:**
```bash
docker compose -f docker-compose.ssl.yml ps
```

**View backend logs:**
```bash
docker compose -f docker-compose.ssl.yml logs -f swiss-jass-backend
```

**View nginx logs:**
```bash
docker compose -f docker-compose.ssl.yml logs -f nginx
```

**Fix database permissions (if needed):**
```bash
sudo chmod 666 backend/prisma/swiss_jass.db
sudo chmod 777 backend/prisma
docker compose -f docker-compose.ssl.yml restart swiss-jass-backend
```

### 📦 Docker Compose Files

- `docker-compose.yml` - Basic HTTP deployment (development)
- `docker-compose.dev.yml` - Development with hot-reload
- `docker-compose.ssl.yml` - Production HTTPS deployment (active)

### 🔄 GitHub Actions

The self-hosted runner workflow is in `.github/workflows/deploy-backend-pi.yml`

**Trigger deployment:**
- Automatically on push to `main`
- Manually via GitHub Actions UI
