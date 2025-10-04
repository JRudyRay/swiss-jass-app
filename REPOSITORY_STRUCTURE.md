# 📁 Swiss Jass App - Repository Structure

**Last Updated**: October 4, 2025  
**Status**: Cleaned and Organized

---

## 🎯 Overview

This document describes the organization and structure of the Swiss Jass App repository after cleanup.

---

## 📂 Root Directory

```
swiss-jass-app/
├── backend/          # Node.js + Express + Socket.IO backend server
├── web/              # React + TypeScript + Vite frontend
├── deploy/           # Deployment scripts and configurations
├── docs/             # Documentation (organized by category)
├── .github/          # GitHub Actions and workflows
├── build.sh          # Build script for production
├── start.sh          # Start script for development
├── package.json      # Root workspace configuration
├── README.md         # Main project documentation
├── LICENSE           # MIT License
├── railway.json      # Railway deployment config
└── render.yaml       # Render deployment config
```

---

## 🔧 Backend Structure

```
backend/
├── src/
│   ├── gameEngine/
│   │   ├── SwissJassEngine.ts      # Core game logic
│   │   └── multiGameManager.ts     # Multi-table management
│   ├── routes/
│   │   ├── admin.ts                # Admin endpoints
│   │   ├── auth.ts                 # Authentication routes
│   │   ├── friends.ts              # Friend management
│   │   ├── games.ts                # Game management
│   │   └── tables.ts               # Table management
│   ├── services/
│   │   ├── authService.ts          # Auth business logic
│   │   ├── friendService.ts        # Friend operations
│   │   ├── gameService.ts          # Game operations
│   │   └── tableService.ts         # Table operations
│   ├── tests/
│   │   ├── friendAndTable.test.ts  # Integration tests
│   │   ├── multiplayerFlow.test.ts # Multiplayer tests
│   │   └── reportStats.test.ts     # Stats reporting tests
│   ├── index.ts                    # Server entry point
│   ├── gameHub.ts                  # Socket.IO hub
│   ├── presence.ts                 # User presence tracking
│   └── prismaClient.ts             # Database client
├── scripts/
│   ├── dbDiagnostics.ts            # Database debugging
│   ├── fullFlowTest.ts             # Full game flow test
│   ├── resetAndSmoke.ts            # Reset & smoke test
│   ├── seedTestUsers.ts            # Test user generation
│   └── smoke_test.js               # Quick health check
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── swiss_jass.db               # SQLite database (gitignored)
├── package.json                    # Backend dependencies
├── tsconfig.json                   # TypeScript config
└── Procfile                        # Heroku/Railway config
```

---

## 🎨 Frontend Structure

```
web/
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx       # Error recovery component
│   │   ├── Loading.tsx             # Loading states (5 variants)
│   │   └── Rankings.tsx            # Player rankings
│   ├── engine/
│   │   └── schieber.ts             # Client-side game logic
│   ├── utils/
│   │   └── totals.ts               # Score calculations
│   ├── assets/
│   │   └── logo.png                # App logo
│   ├── App.tsx                     # Root component
│   ├── AuthForm.tsx                # Login/register form
│   ├── JassGame.tsx                # Main game component
│   ├── SwissCard.tsx               # Card rendering component
│   ├── YouTubePlayer.tsx           # YouTube integration
│   ├── main.tsx                    # Entry point
│   ├── index.css                   # Global styles
│   └── config.ts                   # Frontend configuration
├── scripts/
│   ├── simulate.ts                 # Game simulation
│   ├── unit_tests.ts               # Unit test suite
│   └── check-card-images.js        # Card asset validation
├── public/
│   └── test-helpers.js             # Browser console test utilities
├── dist/                           # Build output (gitignored)
├── dist_scripts/                   # Script bundles (gitignored)
├── index.html                      # HTML template
├── package.json                    # Frontend dependencies
├── tsconfig.json                   # TypeScript config
└── vite.config.ts                  # Vite configuration
```

---

## 📚 Documentation Structure

```
docs/
├── ai-sessions/                    # AI-assisted development sessions
│   ├── COMPREHENSIVE_AUDIT.md      # Full codebase audit
│   ├── PHASE_1_COMPLETE.md         # Phase 1 implementation
│   ├── IMPLEMENTATION_CHECKLIST.md # Deployment checklist
│   ├── INTEGRATION_COMPLETE.md     # Integration guide
│   ├── RESEARCH_AND_IMPLEMENTATION_SUMMARY.md
│   ├── VISUAL_GUIDE.md             # Component usage guide
│   ├── UX_COMPLETE.md              # UX improvements summary
│   ├── TESTING_GUIDE.md            # Comprehensive testing
│   ├── TESTING_SESSION.md          # Testing session log
│   └── QUICK_TEST_CHECKLIST.md     # Quick test checklist
├── audit/                          # Audit reports
├── ACCEPTANCE_CRITERIA_STATUS.md   # Feature acceptance criteria
├── ARCHITECTURE_AUDIT.md           # Architecture analysis
├── CARD_IMAGES_GUIDE.md            # Card asset documentation
├── IMPLEMENTATION_GUIDE.md         # Implementation instructions
├── INTEGRATION_GUIDE.md            # Integration documentation
├── PHASE1_VERIFICATION.md          # Phase 1 verification
├── PHASE2_VALIDATION.md            # Phase 2 validation
├── PHASES_1_2_SUMMARY.md           # Summary of phases 1-2
├── PHASE_5_COMPLETE.md             # Phase 5 completion
├── TESTING.md                      # Testing documentation
├── test-points-persistence.md      # Points persistence tests
├── UX_DESIGN_SYSTEM.md             # Design system specs
└── UX_REDESIGN_SUMMARY.md          # UX redesign overview
```

---

## 🚀 Deployment Structure

```
deploy/
└── raspberry-pi/
    ├── deploy-backend.sh           # Backend deployment script
    └── README.md                   # Deployment instructions
```

---

## 🔒 Ignored Files (.gitignore)

The following files/folders are excluded from version control:

### Dependencies
- `node_modules/`
- `package-lock.json` (workspace-specific)

### Build Artifacts
- `dist/`
- `build/`
- `backend/dist/`
- `web/dist/`
- `web/dist_scripts/`

### Cache
- `.cache/`
- `.vite/`
- `.turbo/`

### Environment
- `.env*` files

### Database
- `*.db`
- `*.db-journal`
- (Exception: `prisma/schema.prisma` is tracked)

### Editor
- `.vscode/`
- `.idea/`

### Temporary
- `*.old`
- `*.tmp`
- `*.bak`
- `*.log`

### OS Files
- `.DS_Store`
- `Thumbs.db`

---

## 📦 Key Files

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` (root) | Workspace configuration |
| `backend/package.json` | Backend dependencies |
| `web/package.json` | Frontend dependencies |
| `backend/tsconfig.json` | Backend TypeScript config |
| `web/tsconfig.json` | Frontend TypeScript config |
| `vite.config.ts` | Vite build configuration |
| `prisma/schema.prisma` | Database schema |

### Deployment Files

| File | Purpose |
|------|---------|
| `railway.json` | Railway.app deployment |
| `render.yaml` | Render.com deployment |
| `Procfile` | Heroku/Railway process |
| `build.sh` | Production build script |
| `start.sh` | Development start script |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `LICENSE` | MIT License |
| `REPOSITORY_STRUCTURE.md` | This file |

---

## 🎯 Development Workflow

### 1. **Setup**
```bash
# Install all dependencies
npm install
cd backend && npm install
cd ../web && npm install
```

### 2. **Development**
```bash
# Start backend (port 3000)
cd backend && npm run dev

# Start frontend (port 3001)
cd web && npm run dev
```

### 3. **Testing**
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd web && npm test

# Run smoke test
node backend/scripts/smoke_test.js
```

### 4. **Build**
```bash
# Build for production
./build.sh

# Or manually:
cd backend && npm run build
cd ../web && npm run build
```

---

## 📊 Component Architecture

### Backend Components
- **Game Engine**: Core Schieber Jass logic
- **Multi-Game Manager**: Manages multiple concurrent games
- **Socket.IO Hub**: Real-time communication
- **REST API**: HTTP endpoints for auth, friends, tables
- **Prisma ORM**: Database access layer

### Frontend Components
- **App.tsx**: Root component with error boundary
- **JassGame.tsx**: Main game interface (2600+ lines)
- **AuthForm.tsx**: Login/registration
- **SwissCard.tsx**: Card rendering
- **Loading.tsx**: Loading states (Spinner, Skeleton, Empty)
- **ErrorBoundary.tsx**: Error recovery

---

## 🔄 Recent Changes (Cleanup)

### ✅ Completed
- [x] Moved AI session docs to `docs/ai-sessions/`
- [x] Removed `gameEngine.ts.old`
- [x] Organized root directory (removed 9+ MD files from root)
- [x] Updated `.gitignore` with comprehensive patterns
- [x] Created this structure documentation

### 📈 Before Cleanup
- **Root MD files**: 12+
- **Old files**: 1 (.old)
- **Unorganized docs**: All in root

### 📉 After Cleanup
- **Root MD files**: 2 (README.md, REPOSITORY_STRUCTURE.md)
- **Old files**: 0
- **Organized docs**: docs/ai-sessions/ (9 files), docs/ (13 files)

---

## 🎓 Best Practices

### File Organization
1. ✅ Keep root directory minimal
2. ✅ Group related files in subdirectories
3. ✅ Use descriptive folder names
4. ✅ Separate concerns (backend/web/docs/deploy)

### Documentation
1. ✅ Main README in root
2. ✅ Technical docs in `docs/`
3. ✅ Session logs in `docs/ai-sessions/`
4. ✅ Code comments for complex logic

### Version Control
1. ✅ Ignore build artifacts
2. ✅ Ignore dependencies
3. ✅ Ignore environment files
4. ✅ Track schema and config files

---

## 🔗 Related Documentation

- **README.md** - Project overview and quick start
- **docs/IMPLEMENTATION_GUIDE.md** - Implementation details
- **docs/TESTING.md** - Testing procedures
- **docs/UX_DESIGN_SYSTEM.md** - Design system
- **docs/ai-sessions/COMPREHENSIVE_AUDIT.md** - Full audit report

---

## 📞 Maintenance

### Regular Cleanup Tasks
- [ ] Review and archive old AI session docs quarterly
- [ ] Update this document when structure changes
- [ ] Clean up test databases periodically
- [ ] Review and remove unused scripts

### File Naming Conventions
- **Components**: PascalCase (e.g., `ErrorBoundary.tsx`)
- **Utils**: camelCase (e.g., `totals.ts`)
- **Scripts**: kebab-case (e.g., `smoke_test.js`)
- **Docs**: UPPERCASE (e.g., `README.md`)

---

**Repository Health**: ✅ Clean and Organized  
**Last Cleanup**: October 4, 2025  
**Next Review**: January 2026
