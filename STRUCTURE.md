# 📁 Repository Structure

## 🌳 Directory Overview

```
swiss-jass-app/
├── 📄 README.md                    # Main project documentation
├── 📄 DEPLOYMENT.md                # Raspberry Pi deployment guide
├── 📄 LICENSE                      # MIT License
│
├── 🎨 web/                         # Frontend React application
│   ├── src/
│   │   ├── App.tsx                 # Main app component
│   │   ├── JassGame.tsx            # Core game interface
│   │   ├── SwissCard.tsx           # Card rendering component
│   │   ├── AuthForm.tsx            # Login/registration
│   │   ├── config.ts               # API configuration
│   │   ├── engine/
│   │   │   └── schieber.ts         # Game rules engine
│   │   └── components/
│   │       └── Rankings.tsx        # Player rankings
│   ├── dist/                       # Built frontend (GitHub Pages)
│   ├── package.json
│   └── vite.config.ts
│
├── 🔧 backend/                     # Backend Node.js API
│   ├── src/
│   │   ├── index.ts                # Express server entry
│   │   ├── gameEngine/
│   │   │   ├── SwissJassEngine.ts  # Core game logic
│   │   │   └── multiGameManager.ts # Game session management
│   │   ├── routes/
│   │   │   ├── auth.ts             # Authentication endpoints
│   │   │   ├── games.ts            # Game CRUD operations
│   │   │   ├── tables.ts           # Multiplayer tables
│   │   │   └── friends.ts          # Friend system
│   │   └── services/
│   │       ├── authService.ts      # JWT auth logic
│   │       ├── gameService.ts      # Game business logic
│   │       └── tableService.ts     # Table management
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   └── swiss_jass.db           # SQLite database
│   ├── Dockerfile                  # Docker build config
│   └── package.json
│
├── 🔒 nginx/                       # Nginx reverse proxy
│   ├── nginx.conf                  # HTTPS configuration
│   └── ssl/                        # SSL certificates
│
├── 🐳 Docker Configuration
│   ├── docker-compose.yml          # Basic HTTP deployment
│   ├── docker-compose.dev.yml      # Development with hot-reload
│   └── docker-compose.ssl.yml      # Production HTTPS (active)
│
├── 🤖 .github/
│   └── workflows/
│       └── deploy-backend-pi.yml   # CI/CD for Raspberry Pi
│
├── 📚 docs/                        # Additional documentation
│   ├── CARD_IMAGES_GUIDE.md
│   ├── TESTING.md
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── INTEGRATION_GUIDE.md
│   └── UX_DESIGN_SYSTEM.md
│
└── 🛠️ Scripts
    ├── generate-ssl-certs.sh       # SSL certificate generation (Linux)
    └── generate-ssl-certs.ps1      # SSL certificate generation (Windows)
```

## 📦 Key Components

### Frontend (web/)
- **Framework:** React + TypeScript + Vite
- **Styling:** TailwindCSS
- **Real-time:** Socket.IO Client
- **Deployment:** GitHub Pages (HTTPS)

### Backend (backend/)
- **Runtime:** Node.js + Express
- **Language:** TypeScript
- **Database:** Prisma + SQLite
- **Auth:** JWT tokens
- **Real-time:** Socket.IO Server
- **Deployment:** Docker on Raspberry Pi

### Infrastructure
- **Reverse Proxy:** Nginx with SSL termination
- **SSL:** Self-signed certificates for local network
- **CI/CD:** GitHub Actions with self-hosted runner
- **Containers:** Docker Compose orchestration

## 🔄 Deployment Flow

```
1. Developer pushes to main branch
2. GitHub Actions triggers
3. Self-hosted runner on Pi pulls code
4. Docker rebuilds containers
5. Nginx serves HTTPS traffic
6. Frontend on GitHub Pages connects via HTTPS
```

## 📝 Important Files

| File | Purpose |
|------|---------|
| `web/src/config.ts` | API endpoint configuration |
| `backend/src/index.ts` | Main server file |
| `backend/prisma/schema.prisma` | Database schema |
| `nginx/nginx.conf` | HTTPS reverse proxy config |
| `docker-compose.ssl.yml` | Production deployment |
| `.github/workflows/deploy-backend-pi.yml` | CI/CD pipeline |

## 🚀 Quick Commands

**Local Development:**
```bash
# Frontend
cd web && npm run dev

# Backend
cd backend && npm run dev
```

**Production Deployment:**
```bash
# On Raspberry Pi
docker compose -f docker-compose.ssl.yml up -d --build
```

**View Logs:**
```bash
docker compose -f docker-compose.ssl.yml logs -f
```
