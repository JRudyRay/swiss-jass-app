# Raspberry Pi Deployment Guide

This folder contains helper assets for hosting the Swiss Jass backend on a Raspberry Pi while keeping continuous delivery from GitHub.

## Architecture Overview

1. The Raspberry Pi runs the Node.js backend (Express + Prisma + SQLite).
2. `pm2` (or a `systemd` unit) keeps the process alive across reboots.
3. A GitHub Actions workflow (`.github/workflows/deploy-backend-pi.yml`) connects over SSH on each push to `main`, pulls the latest code, installs dependencies, builds, and restarts the process.
4. Secrets are stored in the GitHub repository, never on the workflow runner.

## One-Time Raspberry Pi Setup

1. Install dependencies:
   ```bash
   sudo apt update
   sudo apt install -y git build-essential
   curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   source ~/.nvm/nvm.sh
   nvm install 20
   npm install -g pm2
   ```
2. Create the application directory and clone the repository:
   ```bash
   mkdir -p ~/apps
   cd ~/apps
   git clone https://github.com/JRudyRay/swiss-jass-app.git
   cd swiss-jass-app/deploy/raspberry-pi
   ./deploy-backend.sh # uses ~/apps/swiss-jass-app by default
   ```
3. Add your production environment variables:
   ```bash
   cat <<'EOF' > ~/apps/swiss-jass-app/backend/.env
   PORT=3000
   NODE_ENV=production
   JWT_SECRET=replace-with-strong-secret
   DATABASE_URL="file:./swiss_jass.db"
   EOF
   ```
4. Start the backend with pm2 (or adapt to systemd):
   ```bash
   cd ~/apps/swiss-jass-app/backend
   pm2 start dist/index.js --name swiss-jass-backend
   pm2 save
   pm2 startup systemd
   ```
   The last command prints instructions for enabling pm2 on boot.

## GitHub Secrets and Variables

Set the following in **Settings → Secrets and variables → Actions**:

| Type    | Name          | Description                                      |
|---------|---------------|--------------------------------------------------|
| Secret  | `PI_HOST`     | Public IP or DNS of the Raspberry Pi             |
| Secret  | `PI_SSH_USER` | SSH username (e.g. `pi`)                         |
| Secret  | `PI_SSH_KEY`  | Private key that matches the Pi's `authorized_keys` |
| Secret  | `PI_SSH_PORT` | Optional custom SSH port                         |
| Variable| `PI_APP_DIR`  | (Optional) Path to repo on Pi, default `/home/pi/apps/swiss-jass-app` |
| Variable| `PI_BRANCH`   | (Optional) Branch to deploy, default `main`      |

Grant the same public key access to the Pi:
```bash
ssh-copy-id -i ~/.ssh/github-deploy.pub pi@raspberrypi.local
```
Use the matching private key as the value for `PI_SSH_KEY` (include the header/footer lines).

## Manual Rollback or Redeploy

SSH into the Pi and run:
```bash
cd ~/apps/swiss-jass-app
git checkout main
git reset --hard <previous_sha>
cd backend
npm ci
npm run build
pm2 restart swiss-jass-backend
```

## Troubleshooting

- **Workflow fails with SSH timeout** – confirm the Pi is reachable from the internet or configure a VPN/SSH tunnel.
- **`npm ci` takes too long** – ensure the Pi has swap enabled (1–2 GB) if using a model with 1 GB RAM.
- **Process does not stay up** – check `pm2 logs swiss-jass-backend` or `journalctl -u swiss-jass-backend` (if using systemd).
- **Frontend cannot reach backend** – update `web/src/config.ts` or deploy configuration so the frontend points to the Pi's public URL.

For ad-hoc deploys without waiting for CI, you can run the helper script locally:
```bash
ssh pi@raspberrypi.local 'bash -s' < deploy/raspberry-pi/deploy-backend.sh
```
Adjust the SSH target and path as needed.
