# 🚀 QUICK ACTION GUIDE - Swiss Jass App

**Use this guide to implement fixes in the correct order.**

---

## ⚡ IMMEDIATE ACTIONS (Do This First!)

### 1️⃣ Fix Critical Security Issues (30 minutes)

```bash
cd backend

# Install dependencies
npm install zod helmet express-rate-limit

# Set JWT secret
echo 'JWT_SECRET="'$(openssl rand -base64 32)'"' >> .env
```

**Files to update:**

📝 **backend/src/services/authService.ts** (Line 7)
```typescript
// REPLACE:
const JWT_SECRET = process.env.JWT_SECRET || 'swiss-jass-development-secret';

// WITH:
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}
```

📝 **backend/src/index.ts** (After line 22, before `app.use(cors())`)
```typescript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security middleware
app.use(helmet());

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://jrudyray.github.io']
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);
```

**Test:**
```bash
npm run dev
curl http://localhost:3000/health  # Should work
```

---

### 2️⃣ Add Input Validation (45 minutes)

**Create:** `backend/src/validation/schemas.ts`
```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(6)
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1)
});
```

**Create:** `backend/src/middleware/validate.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }
  };
};
```

**Update:** `backend/src/routes/auth.ts` (Top of file)
```typescript
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validation/schemas';

// Update routes:
router.post('/register', validate(registerSchema), async (req, res) => {
  // ... existing code
});

router.post('/login', validate(loginSchema), async (req, res) => {
  // ... existing code
});
```

**Test:**
```bash
npm run dev

# Test invalid request (should return 400)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"short"}'
```

---

## 📊 VERIFICATION CHECKLIST

After completing immediate actions:

- [ ] JWT_SECRET is set in `.env`
- [ ] Server starts without errors
- [ ] `/health` endpoint returns 200
- [ ] Invalid registration returns 400 with Zod errors
- [ ] CORS blocks requests from unauthorized origins
- [ ] Rate limiter works (test with 101 requests)

---

## 🔍 NEXT STEPS (Do After Immediate Fixes)

### Week 1: Testing & Refactoring

**Day 1-2: Game Engine Tests**
```bash
cd web
npm install --save-dev vitest @vitest/ui
```

Copy `web/src/tests/engine/schieber.test.ts` from FIXES.md

```bash
npm run test  # Should pass all tests
```

**Day 3-4: Refactor Scoring**

Copy `web/src/engine/scoring.ts` from FIXES.md

Update `web/src/engine/schieber.ts` to use pure functions.

**Day 5: Database Indexes**
```bash
cd backend
npx prisma migrate dev --name add_performance_indexes
```

Copy migration SQL from FIXES_PART2.md

---

### Week 2: Performance & Accessibility

**Day 1-2: Component Optimization**

Extract components:
- `web/src/components/PlayerHand.tsx`
- `web/src/components/GameTable.tsx`
- `web/src/hooks/useGameState.ts`

**Day 3-4: Accessibility**

Update `web/src/SwissCard.tsx` with ARIA labels (see FIXES_FINAL.md)

**Day 5: E2E Tests**
```bash
cd web
npm install --save-dev @playwright/test
npx playwright install
```

Copy `web/e2e/full-game-flow.spec.ts` from FIXES_PART3.md

---

### Week 3: CI/CD & Deployment

**Day 1-2: GitHub Actions**

Copy `.github/workflows/ci-complete.yml` from FIXES_PART3.md

**Day 3: ESLint Setup**

Copy `.eslintrc.json` for web and backend

**Day 4-5: Lighthouse & PWA**

Copy `lighthouserc.json`, `manifest.json`, `sw.js`

---

## 📚 REFERENCE FILES

All detailed fixes are in these files:

1. **FIXES.md** - Top 5 critical fixes
2. **FIXES_PART2.md** - Database, testing, CI/CD
3. **FIXES_PART3.md** - E2E tests, workflows
4. **FIXES_FINAL.md** - Accessibility, PWA, checklists
5. **AUDIT_SUMMARY.md** - Executive summary

---

## 🆘 TROUBLESHOOTING

### "Module not found: zod"
```bash
cd backend
npm install zod
```

### "JWT_SECRET is not set"
```bash
echo 'JWT_SECRET="'$(openssl rand -base64 32)'"' >> backend/.env
```

### Tests failing
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run test
```

### TypeScript errors
```bash
# Regenerate Prisma client
cd backend
npx prisma generate
```

---

## ✅ SUCCESS CRITERIA

You'll know you're done when:

✅ All tests pass (`npm run test`)  
✅ No TypeScript errors (`npx tsc --noEmit`)  
✅ No ESLint warnings (`npx eslint .`)  
✅ GitHub Actions CI passes  
✅ Lighthouse Performance ≥90  
✅ Lighthouse Accessibility ≥95  
✅ No critical security warnings  

---

**🎯 Focus on security first, then quality, then performance!**
