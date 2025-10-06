# Self-Hosted Runner Setup for Raspberry Pi

## Install GitHub Actions Runner on Pi

```bash
# On your Raspberry Pi
cd ~
mkdir actions-runner && cd actions-runner

# Download the latest runner (check GitHub for latest version)
curl -o actions-runner-linux-arm64-2.317.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.317.0/actions-runner-linux-arm64-2.317.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-arm64-2.317.0.tar.gz

# Configure (you'll get the token from GitHub repo settings)
./config.sh --url https://github.com/JRudyRay/swiss-jass-app --token YOUR_TOKEN_HERE

# Install as a service
sudo ./svc.sh install
sudo ./svc.sh start
```

## Updated Workflow for Self-Hosted Runner

Then modify your workflow to use the self-hosted runner instead of SSH.