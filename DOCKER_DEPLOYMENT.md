# Docker Deployment Guide for Swiss Jass Backend

This guide explains how to deploy the Swiss Jass backend using Docker on a Raspberry Pi with automatic deployment from GitHub.

## Prerequisites

1. Raspberry Pi with Docker and Docker Compose installed
2. SSH access to your Raspberry Pi
3. GitHub repository with the Swiss Jass app

## Setup Instructions

### 1. Raspberry Pi Setup

Run these commands on your Raspberry Pi:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (replace 'pi' with your username)
sudo usermod -aG docker pi

# Note: Docker Compose is now included with Docker as a plugin
# The command is 'docker compose' (with space) not 'docker-compose'

# Create application directory
mkdir -p ~/apps/swiss-jass-app

# Set permissions
sudo chown -R pi:pi ~/apps/swiss-jass-app

# Logout and login for group changes to take effect
```

### 2. GitHub Secrets Configuration

Set up these secrets in your GitHub repository settings:

- `PI_HOST`: Your Raspberry Pi's IP address or hostname
- `PI_SSH_USER`: SSH username (usually 'pi')
- `PI_SSH_KEY`: Your private SSH key for accessing the Pi
- `PI_SSH_PORT`: SSH port (optional, defaults to 22)

### 3. Environment Variables

On your Raspberry Pi, create a `.env` file in the application directory:

```bash
cd ~/apps/swiss-jass-app
cp backend/.env.example .env
```

Edit the `.env` file with your actual values:

```bash
nano .env
```

### 4. Manual Deployment (First Time)

For the first deployment, you can run manually:

```bash
cd ~/apps/swiss-jass-app
./deploy/raspberry-pi/deploy-backend.sh
```

### 5. Automatic Deployment

After setup, every push to the main branch that affects the backend will automatically:

1. Pull the latest code
2. Build the Docker image
3. Start the container
4. Run database migrations
5. Clean up old images

## Docker Commands

### View logs
```bash
docker compose logs -f swiss-jass-backend
```

### Check container status
```bash
docker compose ps
```

### Restart the application
```bash
docker compose restart swiss-jass-backend
```

### Stop the application
```bash
docker compose down
```

### Rebuild and restart
```bash
docker compose up -d --build
```

### Access container shell
```bash
docker compose exec swiss-jass-backend sh
```

## Database Management

### Run migrations
```bash
docker compose exec swiss-jass-backend npx prisma migrate deploy
```

### Access Prisma Studio (for development)
```bash
docker compose exec swiss-jass-backend npx prisma studio
```

### Database backup
```bash
# The database file is persisted in ./data/swiss_jass.db
cp data/swiss_jass.db data/swiss_jass.db.backup.$(date +%Y%m%d_%H%M%S)
```

## Monitoring

### Health Check
The application includes a health endpoint at `http://localhost:3000/health`

### Docker health status
```bash
docker compose ps
```

### System resources
```bash
docker stats swiss-jass-backend
```

## Troubleshooting

### Container won't start
1. Check logs: `docker compose logs swiss-jass-backend`
2. Verify environment variables in `.env`
3. Ensure database directory is writable: `chmod 755 data/`

### Port conflicts
If port 3000 is in use, modify the `docker-compose.yml` ports section:
```yaml
ports:
  - "3001:3000"  # Change external port to 3001
```

### Database issues
1. Check if database file exists: `ls -la data/`
2. Run migrations: `docker compose exec swiss-jass-backend npx prisma migrate deploy`
3. Reset database (CAUTION - deletes all data):
   ```bash
   docker compose down
   rm data/swiss_jass.db
   docker compose up -d
   ```

### Deployment failures
1. Check GitHub Actions logs
2. Verify SSH connection: `ssh pi@your-pi-address`
3. Check disk space: `df -h`
4. Verify Docker is running: `docker --version`

## Performance Optimization

### Resource limits
Add to `docker-compose.yml`:
```yaml
services:
  swiss-jass-backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

### Image cleanup
Automatically clean old images:
```bash
# Add to crontab
0 2 * * 0 docker image prune -f
```

## Security Considerations

1. Use strong JWT secrets in your `.env` file
2. Consider using Docker secrets for sensitive data
3. Keep your Pi system updated
4. Use fail2ban for SSH protection
5. Consider running behind a reverse proxy (nginx)

## Backup Strategy

1. Database: `./data/swiss_jass.db`
2. Environment: `.env` file
3. Logs: Docker logs via `docker-compose logs`

Set up automated backups:
```bash
# Add to crontab for daily backups
0 1 * * * cd ~/apps/swiss-jass-app && cp data/swiss_jass.db data/backups/swiss_jass.db.$(date +\%Y\%m\%d)
```