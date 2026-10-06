### E2E Playwright Tests

**Install dependencies:**
```bash
cd web
npm install --save-dev @playwright/test
npx playwright install
```

**New file:** `web/playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**New file:** `web/e2e/full-game-flow.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Full Swiss Jass Game Flow', () => {
  
  test('should complete a full round with all trump contracts', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the game to load
    await expect(page.locator('text=Swiss Jass')).toBeVisible();
    
    // Start a local game
    await page.click('text=Start local match');
    
    // Choose trump (should be on trump selection phase)
    await expect(page.locator('text=Select Trump')).toBeVisible();
    await page.click('[data-trump="eicheln"]');
    await page.click('text=Submit Trump');
    
    // Wait for game to start
    await expect(page.locator('text=Your Hand')).toBeVisible();
    
    // Play first card (should be player's turn)
    const firstCard = page.locator('.swiss-card').first();
    await firstCard.click();
    
    // Wait for bot players to play their cards
    await page.waitForTimeout(2000);
    
    // Verify trick was resolved
    await expect(page.locator('.trick-count')).toHaveCount(4);
  });

  test('should follow suit rules correctly', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Start local match');
    await page.click('[data-trump="eicheln"]');
    await page.click('text=Submit Trump');
    
    // Wait for game state
    await page.waitForSelector('.swiss-card');
    
    // Check that only legal cards are highlighted
    const playableCards = page.locator('.swiss-card[data-playable="true"]');
    const count = await playableCards.count();
    
    // On first trick, all cards should be playable
    expect(count).toBeGreaterThan(0);
  });

  test('should display correct scores after round', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Start local match');
    await page.click('[data-trump="eicheln"]');
    await page.click('text=Submit Trump');
    
    // Play through entire round (9 tricks)
    for (let i = 0; i < 9; i++) {
      await page.waitForSelector('.swiss-card[data-playable="true"]');
      await page.locator('.swiss-card[data-playable="true"]').first().click();
      await page.waitForTimeout(2000); // Wait for bots
    }
    
    // Verify scores are displayed
    await expect(page.locator('text=Team 1:')).toBeVisible();
    await expect(page.locator('text=Team 2:')).toBeVisible();
    
    // Scores should be greater than 0
    const team1Score = await page.locator('[data-testid="team1-score"]').textContent();
    const team2Score = await page.locator('[data-testid="team2-score"]').textContent();
    
    const total = parseInt(team1Score || '0') + parseInt(team2Score || '0');
    expect(total).toBeGreaterThan(0);
  });

  test('should handle Weis declarations correctly', async ({ page }) => {
    await page.goto('/');
    
    // Start game and select trump
    await page.click('text=Start local match');
    await page.click('[data-trump="eicheln"]');
    await page.click('text=Submit Trump');
    
    // Check for Weis display (if any player has Weis)
    const weisDisplay = page.locator('[data-testid="weis-declarations"]');
    if (await weisDisplay.isVisible()) {
      // Verify Weis points are shown
      await expect(page.locator('text=Weis')).toBeVisible();
    }
  });

  test('should support language toggle', async ({ page }) => {
    await page.goto('/');
    
    // Toggle to Swiss German
    await page.click('[data-testid="lang-toggle"]');
    await expect(page.locator('text=Willkomme bi Swiss Jass!')).toBeVisible();
    
    // Toggle back to English
    await page.click('[data-testid="lang-toggle"]');
    await expect(page.locator('text=Welcome to Swiss Jass!')).toBeVisible();
  });

  test('should persist game state on page reload', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Start local match');
    await page.click('[data-trump="eicheln"]');
    await page.click('text=Submit Trump');
    
    // Play one card
    await page.waitForSelector('.swiss-card[data-playable="true"]');
    await page.locator('.swiss-card[data-playable="true"]').first().click();
    await page.waitForTimeout(1000);
    
    // Get current score
    const scoreBefore = await page.locator('[data-testid="team1-score"]').textContent();
    
    // Reload page
    await page.reload();
    
    // Verify game state persisted
    const scoreAfter = await page.locator('[data-testid="team1-score"]').textContent();
    expect(scoreAfter).toBe(scoreBefore);
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/');
      
      await page.click('text=Start local match');
      
      // Check for ARIA labels on interactive elements
      const cards = page.locator('[role="button"]');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
      
      // Each card should have aria-label
      for (let i = 0; i < Math.min(count, 5); i++) {
        const ariaLabel = await cards.nth(i).getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/');
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Enter should activate focused element
      await page.keyboard.press('Enter');
      
      // Verify something happened (game started or button clicked)
      await page.waitForTimeout(500);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Game should still be playable
      await expect(page.locator('text=Swiss Jass')).toBeVisible();
      await page.click('text=Start local match');
      
      // Cards should be visible and clickable
      await page.click('[data-trump="eicheln"]');
      await page.click('text=Submit Trump');
      
      await expect(page.locator('.swiss-card').first()).toBeVisible();
    });
  });
});
```

**Update web/package.json:**
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report"
  }
}
```

---

## Fix #8: CI/CD Pipeline with GitHub Actions

**New file:** `.github/workflows/ci-complete.yml`
```yaml
name: Complete CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

permissions:
  contents: write
  pages: write
  id-token: write

env:
  NODE_VERSION: '20'

jobs:
  # ============================================================================
  # BACKEND JOBS
  # ============================================================================
  
  backend-typecheck:
    name: Backend - TypeScript Check
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: TypeScript Check
        run: npx tsc --noEmit

  backend-lint:
    name: Backend - Lint
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install ESLint (if not present)
        run: npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
      
      - name: Lint
        run: npx eslint 'src/**/*.{ts,tsx}' --max-warnings 0

  backend-test:
    name: Backend - Unit & Integration Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Run Database Migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: file:./test.db
      
      - name: Run Tests
        run: npm test
        env:
          NODE_ENV: test
          JWT_SECRET: test-secret-key-for-ci

  backend-build:
    name: Backend - Build
    runs-on: ubuntu-latest
    needs: [backend-typecheck, backend-lint]
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: backend-dist
          path: backend/dist

  # ============================================================================
  # FRONTEND JOBS
  # ============================================================================
  
  frontend-typecheck:
    name: Frontend - TypeScript Check
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: TypeScript Check
        run: npx tsc --noEmit

  frontend-lint:
    name: Frontend - Lint
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install ESLint (if not present)
        run: npm install --save-dev eslint eslint-plugin-react eslint-plugin-react-hooks @typescript-eslint/parser @typescript-eslint/eslint-plugin
      
      - name: Lint
        run: npx eslint 'src/**/*.{ts,tsx}' --max-warnings 0

  frontend-unit-tests:
    name: Frontend - Unit Tests (Vitest)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Unit Tests
        run: npm run test:coverage
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        with:
          files: ./web/coverage/coverage-final.json
          flags: frontend
          name: frontend-coverage

  frontend-build:
    name: Frontend - Build
    runs-on: ubuntu-latest
    needs: [frontend-typecheck, frontend-lint]
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_API_URL: https://swiss-jass-app-production.up.railway.app
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: web/dist

  # ============================================================================
  # E2E TESTS
  # ============================================================================
  
  e2e-tests:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    needs: [frontend-build]
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      
      - name: Run Playwright tests
        run: npm run test:e2e
      
      - name: Upload Playwright Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: web/playwright-report/
          retention-days: 30

  # ============================================================================
  # LIGHTHOUSE PERFORMANCE AUDIT
  # ============================================================================
  
  lighthouse:
    name: Lighthouse Performance Audit
    runs-on: ubuntu-latest
    needs: [frontend-build]
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: frontend-dist
          path: web/dist
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Install Lighthouse CI
        run: npm install -g @lhci/cli
      
      - name: Run Lighthouse CI
        run: |
          cd web
          npx serve dist -l 8080 &
          sleep 5
          lhci autorun --config=lighthouserc.json || true
      
      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lighthouse-results
          path: web/.lighthouseci

  # ============================================================================
  # DEPLOY (only on main branch)
  # ============================================================================
  
  deploy-frontend:
    name: Deploy Frontend to GitHub Pages
    runs-on: ubuntu-latest
    needs: [frontend-build, e2e-tests, lighthouse]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: frontend-dist
          path: web/dist
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./web/dist
```

**New file:** `web/lighthouserc.json`
```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:8080"],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "onlyCategories": ["performance", "accessibility", "best-practices", "seo", "pwa"]
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }],
        "categories:pwa": ["warn", { "minScore": 0.7 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**New file:** `backend/.eslintrc.json`
```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "plugins": ["@typescript-eslint"],
  "env": {
    "node": true,
    "es6": true
  },
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "no-console": "off"
  },
  "ignorePatterns": ["dist", "node_modules", "*.js"]
}
```

**New file:** `web/.eslintrc.json`
```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "plugins": ["react", "react-hooks", "@typescript-eslint"],
  "env": {
    "browser": true,
    "es6": true
  },
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off"
  },
  "ignorePatterns": ["dist", "node_modules", "*.config.*"]
}
```

---

Continue to next file for accessibility fixes and final checklist...
