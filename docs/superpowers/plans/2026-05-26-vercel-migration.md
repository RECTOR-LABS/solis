# Vercel Migration — solis-web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `solis-web` (Next.js 15) from VPS `reclabs3` to Vercel, while disabling the subscriber feature (SOLIS is in maintenance mode, zero subscribers exist).

**Architecture:** Vercel native Next.js deployment with monorepo Root Directory `packages/web`. Reports stay git-committed and ship as static assets bundled into the serverless functions via a prebuild copy script + `outputFileTracingIncludes`. Subscriber API endpoints return `503` and the form shows a "subscriptions paused" notice. DNS cutover via Cloudflare CNAME (grey-cloud). VPS kept warm as rollback for 7 days.

**Tech Stack:** Next.js 15.3 + React 19, pnpm workspaces (monorepo), Vercel CLI 54.4.1, Cloudflare DNS, Resend (latent), x402 micropayments.

**Pre-resolved decisions:**
- Subscribers → **disabled** (SSH-verified: zero subscribers ever recorded).
- VPS subscribers export → done (file did not exist on VPS, `ssh solis 'ls /home/solis/solis/data/'` showed empty).
- Execution mode → plan-first, then execute task-by-task.

**Out of scope:** `packages/agent` (heartbeat daemon — not deployed as web service, currently disabled on VPS). VPS decommission is documented in Task 11 but NOT executed in this plan.

---

## File Structure

**Modify:**
- `packages/web/next.config.ts` — remove `output: 'standalone'` + `outputFileTracingRoot`, add `outputFileTracingIncludes`.
- `packages/web/package.json` — add `prebuild` script that copies `reports/` from monorepo root into `packages/web/reports/`.
- `packages/web/src/lib/subscribers.ts` — replace filesystem ops with disabled stubs that throw a typed error.
- `packages/web/src/app/api/subscribe/route.ts` — return `503` from POST/DELETE before touching subscriber lib.
- `packages/web/src/app/api/digest/route.ts` — return `503` (depends on subscribers).
- `packages/web/src/components/subscribe-form.tsx` — replace form with a "paused" notice.
- `packages/web/src/lib/reports.ts` — change `REPORTS_DIR` default to `join(process.cwd(), 'reports')`.
- `packages/web/src/app/api/signals/route.ts` — same path fix.
- `packages/web/tests/lib/subscribers.test.ts` — replace file-write tests with disabled-behaviour assertions.
- `packages/web/tests/api/subscribe.test.ts` — assert `503` for POST/DELETE.
- `packages/web/.gitignore` — add `reports/` so the build copy isn't accidentally committed.

**Create:**
- `packages/web/scripts/copy-reports.mjs` — prebuild script (cross-platform; avoids depending on `cp -r`).
- `packages/web/vercel.json` — install command override to filter monorepo install to `@solis/web`.

**Untouched:** All other web files, the entire `packages/agent`, the `shared/` package, and the source-of-truth `reports/` directory at monorepo root.

---

## Task 1: Pre-flight Baseline

**Files:**
- No code changes — just baseline capture.

- [ ] **Step 1: Confirm clean git state**

Run:
```bash
cd /Users/rector/local-dev/solis
git status
git pull --rebase origin main
```

Expected: Working tree clean (except possibly the handoff doc / this plan file). On `main` branch.

- [ ] **Step 2: Install + smoke-test baseline build**

Run:
```bash
pnpm install
pnpm --filter @solis/web build
```

Expected: `next build` succeeds. Note the warning about `output: 'standalone'` if any. Output ends with `Compiled successfully`.

- [ ] **Step 3: Capture baseline test count**

Run:
```bash
pnpm --filter @solis/web test:run 2>&1 | tail -20
```

Expected: 180 web tests pass (per memory). Record the actual count for comparison after our changes.

- [ ] **Step 4: Confirm Vercel CLI version**

Run:
```bash
vercel --version
```

Expected: `54.4.1` or later. (Already confirmed locally.)

- [ ] **Step 5: Create migration branch**

Run:
```bash
git checkout -b chore/vercel-migration
git push -u origin chore/vercel-migration
```

Expected: New branch tracks remote. No commits yet.

---

## Task 2: Disable Subscriber Feature (TDD)

**Files:**
- Modify: `packages/web/src/lib/subscribers.ts`
- Modify: `packages/web/src/app/api/subscribe/route.ts`
- Modify: `packages/web/src/app/api/digest/route.ts`
- Modify: `packages/web/src/components/subscribe-form.tsx`
- Modify: `packages/web/tests/lib/subscribers.test.ts`
- Modify: `packages/web/tests/api/subscribe.test.ts`

### Step 1: Rewrite the subscribers lib test for disabled behaviour

- [ ] **Step 1: Replace `tests/lib/subscribers.test.ts` entirely**

Replace the file contents with:

```typescript
import { describe, it, expect } from 'vitest';
import {
  addSubscriber,
  removeSubscriber,
  loadSubscribers,
  isValidEmail,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  SubscriptionsDisabledError,
} from '@/lib/subscribers';

describe('subscribers (disabled — maintenance mode)', () => {
  it('loadSubscribers returns empty array', async () => {
    const subs = await loadSubscribers();
    expect(subs).toEqual([]);
  });

  it('addSubscriber throws SubscriptionsDisabledError', async () => {
    await expect(addSubscriber('test@example.com')).rejects.toBeInstanceOf(
      SubscriptionsDisabledError,
    );
  });

  it('removeSubscriber throws SubscriptionsDisabledError', async () => {
    await expect(removeSubscriber('test@example.com')).rejects.toBeInstanceOf(
      SubscriptionsDisabledError,
    );
  });
});

describe('unsubscribe tokens (preserved — used by historical email links)', () => {
  it('generates and verifies tokens', () => {
    process.env.DIGEST_UNSUBSCRIBE_SECRET = 'test-secret-key-123';
    const token = generateUnsubscribeToken('test@example.com');
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64);
    expect(verifyUnsubscribeToken('test@example.com', token)).toBe(true);
  });

  it('rejects invalid tokens', () => {
    process.env.DIGEST_UNSUBSCRIBE_SECRET = 'test-secret-key-123';
    expect(verifyUnsubscribeToken('test@example.com', 'deadbeef'.repeat(8))).toBe(false);
  });

  it('is case-insensitive', () => {
    process.env.DIGEST_UNSUBSCRIBE_SECRET = 'test-secret-key-123';
    const token = generateUnsubscribeToken('Test@Example.com');
    expect(verifyUnsubscribeToken('test@example.com', token)).toBe(true);
  });
});

describe('email validation', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a.b+c@sub.domain.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@no-user.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects overly long emails', () => {
    expect(isValidEmail(`${'a'.repeat(312)}@test.com`)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test, expect failures (module doesn't export `SubscriptionsDisabledError` yet)**

Run:
```bash
pnpm --filter @solis/web test:run tests/lib/subscribers.test.ts
```

Expected: FAIL — "SubscriptionsDisabledError is not defined" / "addSubscriber did not reject".

### Step 3: Rewrite the subscribers lib to be disabled

- [ ] **Step 3: Replace `packages/web/src/lib/subscribers.ts`**

Replace the file contents with:

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Subscriber } from '@solis/shared';

export class SubscriptionsDisabledError extends Error {
  constructor() {
    super('Subscriptions are paused (maintenance mode)');
    this.name = 'SubscriptionsDisabledError';
  }
}

export async function loadSubscribers(): Promise<Subscriber[]> {
  return [];
}

export async function addSubscriber(_email: string): Promise<void> {
  throw new SubscriptionsDisabledError();
}

export async function removeSubscriber(_email: string): Promise<void> {
  throw new SubscriptionsDisabledError();
}

function getHmacSecret(): string {
  const secret = process.env.DIGEST_UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('DIGEST_UNSUBSCRIBE_SECRET not configured');
  return secret;
}

export function generateUnsubscribeToken(email: string): string {
  const hmac = createHmac('sha256', getHmacSecret());
  hmac.update(email.toLowerCase().trim());
  return hmac.digest('hex');
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  try {
    const expected = generateUnsubscribeToken(email);
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(token, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 320;
}
```

- [ ] **Step 4: Run the test, expect pass**

Run:
```bash
pnpm --filter @solis/web test:run tests/lib/subscribers.test.ts
```

Expected: PASS — all subscriber tests green.

### Step 5: Update the subscribe API tests

- [ ] **Step 5: Replace `tests/api/subscribe.test.ts`**

Replace the file contents with:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { _resetStore } from '@/lib/rate-limit';

const ORIGINAL_ENV = { ...process.env };

function makePostRequest(body?: object): Request {
  return new Request('http://localhost/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.1',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeDeleteRequest(params?: Record<string, string>): Request {
  const url = new URL('http://localhost/api/subscribe');
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new Request(url.toString(), {
    method: 'DELETE',
    headers: { 'x-forwarded-for': '10.0.0.2' },
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.ENABLE_X402;
  _resetStore();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

async function getHandlers() {
  const mod = await import('@/app/api/subscribe/route');
  return { POST: mod.POST, DELETE: mod.DELETE };
}

describe('/api/subscribe POST (disabled — maintenance mode)', () => {
  it('returns 503 with explanatory message regardless of body', async () => {
    const { POST } = await getHandlers();
    const res = await POST(makePostRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/paused|disabled|maintenance/i);
  });

  it('returns 503 even with no body', async () => {
    const { POST } = await getHandlers();
    const res = await POST(makePostRequest());
    expect(res.status).toBe(503);
  });
});

describe('/api/subscribe DELETE (disabled — maintenance mode)', () => {
  it('returns 503 regardless of params', async () => {
    const { DELETE } = await getHandlers();
    const res = await DELETE(makeDeleteRequest({ email: 'test@example.com', token: 'whatever' }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/paused|disabled|maintenance/i);
  });
});
```

- [ ] **Step 6: Run test, expect failures**

Run:
```bash
pnpm --filter @solis/web test:run tests/api/subscribe.test.ts
```

Expected: FAIL — current route returns 400/200, not 503.

### Step 7: Update the subscribe route handler

- [ ] **Step 7: Replace `packages/web/src/app/api/subscribe/route.ts`**

Replace the file contents with:

```typescript
import { NextResponse } from 'next/server';
import { handleCorsOptions } from '@/lib/api-guard';

const DISABLED_BODY = {
  error: 'Subscriptions are paused (maintenance mode). Follow updates via RSS or the GitHub repo.',
};

export function OPTIONS(request: Request) {
  return handleCorsOptions(request) ?? new Response(null, { status: 204 });
}

export async function POST() {
  return NextResponse.json(DISABLED_BODY, { status: 503 });
}

export async function DELETE() {
  return NextResponse.json(DISABLED_BODY, { status: 503 });
}
```

- [ ] **Step 8: Run subscribe API tests, expect pass**

Run:
```bash
pnpm --filter @solis/web test:run tests/api/subscribe.test.ts
```

Expected: PASS.

### Step 9: Disable the digest endpoint too (it depends on `sendDigest` which iterates subscribers)

- [ ] **Step 9: Replace `packages/web/src/app/api/digest/route.ts`**

Replace the file contents with:

```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Digest delivery is paused (maintenance mode).' },
    { status: 503 },
  );
}
```

(We keep the route handler so the route still exists but is inert. No test file existed for `api/digest` — verify.)

- [ ] **Step 10: Verify no digest test file exists**

Run:
```bash
ls packages/web/tests/api/digest* 2>/dev/null || echo "(no digest test — confirmed)"
```

Expected: `(no digest test — confirmed)`.

### Step 11: Update the subscribe form

- [ ] **Step 11: Replace `packages/web/src/components/subscribe-form.tsx`**

Replace the file contents with:

```typescript
export function SubscribeForm() {
  return (
    <div className="max-w-md mx-auto text-center">
      <p className="text-sol-muted text-sm">
        Email subscriptions are paused. Follow updates via{' '}
        <a
          href="/feed.xml"
          className="text-sol-purple hover:underline"
        >
          RSS
        </a>{' '}
        or watch the{' '}
        <a
          href="https://github.com/RECTOR-LABS/solis"
          className="text-sol-purple hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub repo
        </a>
        .
      </p>
    </div>
  );
}
```

(Server component now — no `'use client'`, no state.)

- [ ] **Step 12: Run the full web test suite**

Run:
```bash
pnpm --filter @solis/web test:run
```

Expected: All ~180 tests pass. If any other test imports `SubscribeForm` and expects form behavior, it will fail — fix by asserting the new notice text instead.

- [ ] **Step 13: Run typecheck**

Run:
```bash
pnpm --filter @solis/web typecheck
```

Expected: No errors. Unused imports in route files will surface — clean them.

- [ ] **Step 14: Commit**

Run:
```bash
git add packages/web/src/lib/subscribers.ts \
        packages/web/src/app/api/subscribe/route.ts \
        packages/web/src/app/api/digest/route.ts \
        packages/web/src/components/subscribe-form.tsx \
        packages/web/tests/lib/subscribers.test.ts \
        packages/web/tests/api/subscribe.test.ts
git commit -m "chore(web): disable subscribe and digest endpoints (maintenance mode)"
```

---

## Task 3: Reports Bundling Strategy (TDD)

**Goal:** Make `reports/` available at runtime on Vercel by copying it into `packages/web/reports/` at build time and pointing `REPORTS_DIR` at it. Without this, `lib/reports.ts` and `api/signals/route.ts` will fail with `ENOENT` because their `../../reports/` relative path won't resolve in a Vercel serverless function.

**Files:**
- Create: `packages/web/scripts/copy-reports.mjs`
- Modify: `packages/web/package.json` (add `prebuild` script)
- Modify: `packages/web/.gitignore` (ignore `packages/web/reports/`)
- Modify: `packages/web/src/lib/reports.ts` (path default)
- Modify: `packages/web/src/app/api/signals/route.ts` (path default)

- [ ] **Step 1: Create the copy script**

Write `packages/web/scripts/copy-reports.mjs`:

```javascript
import { cp, mkdir, access, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(SCRIPT_DIR, '..');
const SOURCE = resolve(WEB_ROOT, '..', '..', 'reports');
const TARGET = resolve(WEB_ROOT, 'reports');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(SOURCE))) {
    console.error(`[copy-reports] Source not found: ${SOURCE}`);
    process.exit(1);
  }

  if (await exists(TARGET)) {
    await rm(TARGET, { recursive: true, force: true });
  }

  await mkdir(dirname(TARGET), { recursive: true });
  await cp(SOURCE, TARGET, { recursive: true });
  console.log(`[copy-reports] Copied ${SOURCE} -> ${TARGET}`);
}

main().catch(err => {
  console.error('[copy-reports] Failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify the copy script works locally**

Run:
```bash
node packages/web/scripts/copy-reports.mjs
ls packages/web/reports/ | head -5
```

Expected: Prints "Copied ... -> ..." then listing shows `.gitkeep`, `2026-02-12.md`, `2026-02-14.json`, etc.

- [ ] **Step 3: Add `prebuild` script to `packages/web/package.json`**

Edit `packages/web/package.json` — replace the `scripts` block with:

```json
  "scripts": {
    "dev": "next dev --port 3001",
    "prebuild": "node scripts/copy-reports.mjs",
    "build": "next build",
    "start": "next start --port 3001",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "test": "vitest",
    "test:run": "vitest run"
  },
```

- [ ] **Step 4: Add the copy target to gitignore so it isn't committed**

Edit `packages/web/.gitignore` — if the file doesn't exist, create it; otherwise append. To check:

```bash
cat packages/web/.gitignore 2>/dev/null
```

If `packages/web/.gitignore` is missing or doesn't contain `/reports/`, edit it to add:

```gitignore
# build-time copy from monorepo root
/reports/
```

If `packages/web/.gitignore` doesn't exist, create it with just those two lines.

- [ ] **Step 5: Verify gitignore works (the copied reports should not appear in `git status`)**

Run:
```bash
git status packages/web/reports/
```

Expected: empty output (or "nothing to commit") — confirms the directory is ignored.

- [ ] **Step 6: Update `packages/web/src/lib/reports.ts` path default**

Edit `packages/web/src/lib/reports.ts` line 5. Replace:

```typescript
const REPORTS_DIR = process.env.REPORTS_DIR || join(process.cwd(), '../../reports');
```

with:

```typescript
const REPORTS_DIR = process.env.REPORTS_DIR || join(process.cwd(), 'reports');
```

(One-character semantic change: `'../../reports'` → `'reports'`. Code now expects `reports/` to live adjacent to the Next.js project root — which is exactly where the prebuild copy puts it on both Vercel and local builds. Local `pnpm dev` still works because the prebuild script doesn't run for `dev`, but `lib/reports.ts` is only hit by server routes which read from the FS — `pnpm dev` users should set `REPORTS_DIR=../../reports` in their local `.env` or run `node scripts/copy-reports.mjs` once. Add a `predev` script in the next step.)

- [ ] **Step 7: Update `packages/web/src/app/api/signals/route.ts` path**

Edit `packages/web/src/app/api/signals/route.ts` line 8. Replace:

```typescript
const REPORTS_DIR = join(process.cwd(), '../../reports/signals');
```

with:

```typescript
const REPORTS_DIR = process.env.REPORTS_DIR
  ? join(process.env.REPORTS_DIR, 'signals')
  : join(process.cwd(), 'reports', 'signals');
```

(Honors `REPORTS_DIR` env var same as `lib/reports.ts`, falling back to the prebuild copy location.)

- [ ] **Step 8: Add `predev` script so local dev gets reports copied automatically**

Edit `packages/web/package.json` scripts block, add `predev`:

```json
  "scripts": {
    "predev": "node scripts/copy-reports.mjs",
    "dev": "next dev --port 3001",
    "prebuild": "node scripts/copy-reports.mjs",
    "build": "next build",
    "start": "next start --port 3001",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "test": "vitest",
    "test:run": "vitest run"
  },
```

- [ ] **Step 9: Run typecheck**

Run:
```bash
pnpm --filter @solis/web typecheck
```

Expected: No errors.

- [ ] **Step 10: Run the full test suite**

Run:
```bash
pnpm --filter @solis/web test:run
```

Expected: All tests pass. Tests for `lib/reports.ts` and `api/signals` should pass — they typically mock `node:fs/promises` or set `REPORTS_DIR` in `beforeEach`. Inspect any failures and fix by setting `REPORTS_DIR` in the test's `beforeEach` rather than reverting.

- [ ] **Step 11: Build smoke test**

Run:
```bash
pnpm --filter @solis/web build
```

Expected: `prebuild` runs, prints "Copied ... -> ...", then `next build` succeeds. Note: build will warn about `output: 'standalone'` referencing files — that's fine; we'll fix the config next.

- [ ] **Step 12: Commit**

Run:
```bash
git add packages/web/scripts/copy-reports.mjs \
        packages/web/package.json \
        packages/web/.gitignore \
        packages/web/src/lib/reports.ts \
        packages/web/src/app/api/signals/route.ts
git commit -m "feat(web): bundle reports via prebuild copy for Vercel deployment"
```

---

## Task 4: Update next.config.ts for Vercel

**Files:**
- Modify: `packages/web/next.config.ts`

- [ ] **Step 1: Replace `packages/web/next.config.ts`**

Replace the file contents with:

```typescript
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://openrouter.ai https://x402.org",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@solis/shared'],
  outputFileTracingIncludes: {
    '/**/*': ['./reports/**/*.{json,md}'],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
```

**Changes:**
- Removed `output: 'standalone'` — Vercel handles its own packaging.
- Removed `outputFileTracingRoot` — irrelevant once standalone is gone, and could confuse Vercel's tracing.
- Removed the `import { resolve } from 'node:path'` import (no longer used).
- Added `outputFileTracingIncludes` so `reports/` (copied by the prebuild script) is bundled into every serverless function. Path is relative to `packages/web/`.

- [ ] **Step 2: Local build smoke test**

Run:
```bash
pnpm --filter @solis/web build
```

Expected: Builds cleanly. No more "standalone output" warnings. Output mentions "Standalone build is not detected" or simply omits that line. Build size may print.

- [ ] **Step 3: Run typecheck and tests one more time**

Run:
```bash
pnpm --filter @solis/web typecheck && pnpm --filter @solis/web test:run
```

Expected: Both pass.

- [ ] **Step 4: Commit**

Run:
```bash
git add packages/web/next.config.ts
git commit -m "chore(web): remove standalone output and add tracing includes for Vercel"
```

---

## Task 5: Create Vercel Project Config

**Files:**
- Create: `packages/web/vercel.json`

- [ ] **Step 1: Create `packages/web/vercel.json`**

Write `packages/web/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm build",
  "installCommand": "cd ../.. && pnpm install --filter @solis/web... --frozen-lockfile",
  "framework": "nextjs"
}
```

**Reasoning:**
- `installCommand` filters monorepo install to `@solis/web` and its workspace deps (just `@solis/shared`). Avoids installing all of `packages/agent`'s deps on every Vercel build.
- `buildCommand` is the package's own `build` script which runs `prebuild` first (copying reports).
- `framework: "nextjs"` makes detection explicit.
- No `rootDirectory` — that's a Vercel dashboard / project-config setting, not a `vercel.json` field.

- [ ] **Step 2: Commit**

Run:
```bash
git add packages/web/vercel.json
git commit -m "chore(web): add vercel.json with monorepo install filter"
```

- [ ] **Step 3: Push branch**

Run:
```bash
git push origin chore/vercel-migration
```

Expected: branch updated on remote.

---

## Task 6: Vercel Project Setup (Manual — Checkpoint)

**This step requires interactive Vercel CLI input. Pause and follow the prompts.**

- [ ] **Step 1: Link the project**

Run from monorepo root:
```bash
cd /Users/rector/local-dev/solis
vercel link
```

Prompts (answer as follows):
- "Set up ...?" → **Yes**
- "Which scope?" → **rectorspace** (or whichever Vercel team owns RECTOR-LABS — confirm with RECTOR if multiple options).
- "Link to existing project?" → **No** (we're creating fresh).
- "What's your project's name?" → **solis-web**
- "In which directory is your code located?" → **packages/web**
- "Which framework?" → Should auto-detect **Next.js**. Accept.
- "Want to modify these settings?" → **No** (we configured via vercel.json).

Expected: Creates `.vercel/project.json` in the monorepo root. `.vercel/` is already gitignored.

- [ ] **Step 2: Verify link**

Run:
```bash
cat .vercel/project.json
```

Expected: JSON with `projectId` and `orgId` set.

- [ ] **Step 3: Verify Root Directory was set correctly**

In a browser, open the Vercel dashboard for the new `solis-web` project → Settings → General → Root Directory. Should be `packages/web`. If not, set it manually.

Confirm interactively with RECTOR before proceeding to env vars: "Vercel project linked. Root Directory = packages/web confirmed in dashboard. Proceed to env vars?"

---

## Task 7: Configure Environment Variables (Checkpoint)

**Files:**
- No code changes — Vercel dashboard / CLI only.

- [ ] **Step 1: Collect env values from VPS**

Run:
```bash
ssh solis "cat /home/solis/solis/.env 2>/dev/null | grep -vE '^(#|$)'" > /tmp/solis-vps-env.txt
cat /tmp/solis-vps-env.txt
```

Review the file. We need the following keys for Vercel (skip any agent-only keys):
- `OPENROUTER_API_KEY` (required — query API uses this)
- `DIGEST_UNSUBSCRIBE_SECRET` (preserved — used to verify unsub tokens from old emails)
- `DIGEST_API_SECRET` (preserved — even though digest is disabled, keep parity)
- `API_RATE_LIMIT` (optional — has 30/hr default)
- `API_RATE_WINDOW_MS` (optional — has 1hr default)
- `ENABLE_X402` (optional — currently false)
- `X402_RECEIVER_ADDRESS` (optional)
- `X402_PRICE_CENTS` (optional)
- `RESEND_API_KEY` (optional — digest is disabled anyway)

**Do NOT carry over:** `DATA_DIR`, `REPORTS_DIR` (Vercel default works), `NODE_ENV` (Vercel sets), `GITHUB_TOKEN`, `SOLIS_HELIUS_API_KEY` (agent-only).

- [ ] **Step 2: Add env vars via CLI for Production + Preview**

For each value, run (replace `<KEY>` and supply value when prompted):

```bash
vercel env add OPENROUTER_API_KEY production
vercel env add OPENROUTER_API_KEY preview
vercel env add DIGEST_UNSUBSCRIBE_SECRET production
vercel env add DIGEST_UNSUBSCRIBE_SECRET preview
vercel env add DIGEST_API_SECRET production
vercel env add DIGEST_API_SECRET preview
```

(Add x402 keys only if `ENABLE_X402=true` on VPS. Add `RESEND_API_KEY` only if RECTOR wants to re-enable digest from Vercel later.)

When prompted for the value, paste from `/tmp/solis-vps-env.txt`.

- [ ] **Step 3: Verify env vars are set**

Run:
```bash
vercel env ls
```

Expected: Table listing each key with Production + Preview marked. Values are not shown (encrypted).

- [ ] **Step 4: Delete the temp env file**

Run:
```bash
rm /tmp/solis-vps-env.txt
```

Expected: file removed. (Important — that file contains secrets.)

---

## Task 8: Preview Deploy + Verification (Checkpoint)

**Files:**
- No code changes.

- [ ] **Step 1: Deploy a preview**

Run from monorepo root:
```bash
vercel deploy
```

Expected: Build runs (showing the `prebuild` copying reports), then deployment completes. Outputs a preview URL like `https://solis-web-xxx.vercel.app`.

- [ ] **Step 2: Smoke-test the preview URL**

Replace `<PREVIEW_URL>` with the URL from step 1:

```bash
PREVIEW=<PREVIEW_URL>
curl -sI $PREVIEW                              # Expect 200 + security headers
curl -s $PREVIEW/api/reports | head -c 500     # Expect JSON with dates array
curl -s $PREVIEW/api/signals?date=2026-04-06   # Expect JSON, not 404
curl -s -X POST $PREVIEW/api/subscribe         # Expect 503
curl -s -X POST $PREVIEW/api/digest            # Expect 503 or 401 (no secret)
curl -sI $PREVIEW/feed.xml                     # Expect 200 + Content-Type: application/xml or text/xml
```

Expected: All endpoints respond as expected. If `/api/reports` is empty or `/api/signals` returns 404, the reports bundle is broken — see "Debugging" section below.

- [ ] **Step 3: Browser test (visual verification)**

Open `<PREVIEW_URL>` in a browser and verify:
- Homepage renders with hero, pipeline, latest report cards.
- `/report/2026-04-06` (or latest date) renders: header, metrics cards, narratives, charts.
- `/trends` renders Recharts multi-line chart.
- `/brain` renders the force-graph (react-force-graph-2d uses Canvas — verify graph appears).
- `/archive` lists reports.
- Subscribe section on homepage shows the "paused" notice (no form).
- No JS console errors.

- [ ] **Step 4: If anything broken, debug before continuing**

Common issues + fixes:
- **Reports 404 in API**: The `outputFileTracingIncludes` glob didn't match, OR prebuild script didn't run. Check `vercel logs --since 5m` for the build output — look for "Copied /vercel/path0/reports -> /vercel/path0/packages/web/reports". If missing, your `prebuild` script isn't running — verify it's in `packages/web/package.json` scripts block.
- **Charts not rendering**: Likely CSP issue. Open browser devtools console — if CSP error mentions `unsafe-eval`, check `next.config.ts` CSP value. Recharts and react-force-graph shouldn't need `unsafe-eval`, but if they do, add it temporarily and file an issue.
- **`@solis/shared` module not found**: `transpilePackages` config or `installCommand` filter is missing/wrong. Verify `packages/web/vercel.json` and the workspace install.
- **Build fails with "Cannot find module 'reports'"**: The `outputFileTracingIncludes` path is wrong. Try `['../../reports/**/*.{json,md}']` instead, then redeploy.

**Checkpoint:** Confirm with RECTOR that the preview deploy is fully functional before proceeding to DNS cutover. This is the last reversible state.

---

## Task 9: Production Domain + DNS Cutover (DESTRUCTIVE — Checkpoint)

**This task changes the live production DNS. Confirm explicitly with RECTOR before running each step.**

**Files:**
- No code changes — Vercel dashboard + Cloudflare DNS only.

- [ ] **Step 1: Add the production domain on Vercel**

Run:
```bash
vercel domains add solis.rectorspace.com
```

OR in the Vercel dashboard: Project → Settings → Domains → Add `solis.rectorspace.com`.

Vercel will show DNS instructions. Note the required CNAME target (`cname.vercel-dns.com` or similar).

- [ ] **Step 2: Production deploy first (so the domain has somewhere to point)**

Run:
```bash
vercel --prod
```

Expected: Builds, deploys to production. Outputs the production Vercel URL (typically `solis-web.vercel.app`).

- [ ] **Step 3: Lower Cloudflare TTL to 300s (10 minutes ahead of cutover)**

In Cloudflare dashboard for `rectorspace.com` zone → DNS → find the `solis` A record (`151.245.137.75`) → Edit TTL → 300 (or "Auto" if proxied; the proxied "Auto" is already 1 minute effectively).

If it's currently Proxied (orange cloud), note this — we'll change cloud state below.

Wait ~10 minutes for old TTL to expire across resolvers.

- [ ] **Step 4: Replace A record with CNAME to Vercel (DESTRUCTIVE — confirm with RECTOR)**

In Cloudflare:
1. Delete the existing A record for `solis` → `151.245.137.75`.
2. Create a new CNAME record: `solis` → `cname.vercel-dns.com` (use whatever target Vercel showed in Step 1).
3. Set proxy status to **DNS only** (grey cloud) — Vercel needs to manage its own TLS handshake; Cloudflare proxy would interfere.

- [ ] **Step 5: Verify DNS resolution**

Run:
```bash
dig solis.rectorspace.com +short
dig solis.rectorspace.com CNAME +short
```

Expected: Resolves to a Vercel IP (e.g., `76.76.21.x`). CNAME query shows `cname.vercel-dns.com`.

If still resolving to `151.245.137.75`, the change hasn't propagated yet — wait 60s and retry. You can also run `dig @8.8.8.8 solis.rectorspace.com` to bypass local cache.

- [ ] **Step 6: Verify HTTPS + content from the production domain**

Run:
```bash
curl -sI https://solis.rectorspace.com
curl -s https://solis.rectorspace.com/api/reports | head -c 500
```

Expected: HTTP/2 200 with security headers + Vercel headers (e.g., `x-vercel-id`). `/api/reports` returns JSON.

If TLS fails ("certificate" or "SSL" error): Vercel cert issuance can take 1-5 minutes after DNS resolves. Wait and retry.

If Vercel returns "Domain not configured" or 404: Re-check Step 1 (domain added on Vercel), and ensure the production deployment from Step 2 succeeded (`vercel ls` should show it as production-ready).

- [ ] **Step 7: Browser test on production domain**

Open `https://solis.rectorspace.com` and verify identically to Task 8 Step 3.

**Checkpoint:** Confirm with RECTOR: "DNS cutover complete. Production verified. VPS container still running as rollback. Proceed to post-cutover documentation?"

---

## Task 10: Post-Cutover Verification + RSS / Sitemap Sanity

**Files:**
- No code changes.

- [ ] **Step 1: Verify RSS feed**

Run:
```bash
curl -s https://solis.rectorspace.com/feed.xml | head -50
```

Expected: Well-formed XML, `<rss version="2.0">` opener, item entries for recent reports.

- [ ] **Step 2: Verify the trends and brain pages render**

In a fresh browser tab (cache-busted), visit:
- `https://solis.rectorspace.com/trends` → multi-line chart renders.
- `https://solis.rectorspace.com/brain` → force-graph renders (give it 2-3 seconds — graph initializes via Canvas).

- [ ] **Step 3: Capture a deployment status snapshot**

Run:
```bash
vercel ls --prod | head -10
```

Expected: Latest production deployment listed with state `Ready`.

- [ ] **Step 4: Run the verify skill for end-to-end confirmation**

If available, invoke the project-aware verify skill to test the full flow.

---

## Task 11: VPS Decommission Plan (DOCUMENT ONLY — Do Not Execute)

**This is documentation of the future cleanup, NOT executed in this plan. Per the handoff, observe a 7-day buffer before decommissioning the VPS.**

- [ ] **Step 1: Append a `VPS_DECOM.md` checklist for the 7-day-later cleanup**

Write `packages/web/VPS_DECOM.md`:

```markdown
# solis-web VPS Decommission Checklist

> **Execute no earlier than 7 days after Vercel cutover.** Confirm zero traffic still hitting VPS before deleting anything.

## Pre-decom verification
- [ ] `dig solis.rectorspace.com +short` returns Vercel IPs only
- [ ] `ssh solis 'docker logs solis-web --since 7d 2>&1 | grep -c "GET /"'` shows zero or near-zero (some uptime checks may still hit it).
- [ ] `vercel ls --prod` confirms `solis.rectorspace.com` is the active alias.

## VPS cleanup (run after verification)
```bash
ssh solis
cd ~/solis
docker compose down
docker image prune -f
exit
```

```bash
ssh reclabs3   # root
sudo rm /etc/nginx/sites-enabled/solis.rectorspace.com
sudo rm /etc/nginx/sites-available/solis.rectorspace.com
sudo nginx -t && sudo systemctl reload nginx
sudo certbot delete --cert-name solis.rectorspace.com
exit
```

## Registry update
Edit `~/.ssh/vps-port-registry.md` — remove the `8001 - solis-web` line.

## GitHub Actions cleanup
Disable or delete `.github/workflows/deploy.yml` (the VPS deploy workflow). Vercel handles deploys now via Git integration.

## Optional: Delete VPS user
If no other services run as user `solis` on reclabs3:
```bash
ssh reclabs3 'sudo userdel -r solis'
```
Confirm `ls -l /home/` shows no other dirs reliant on the user first.
```

- [ ] **Step 2: Commit the decom doc**

Run:
```bash
git add packages/web/VPS_DECOM.md
git commit -m "docs: add VPS decommission checklist (execute after 7-day buffer)"
```

- [ ] **Step 3: Update the migration handoff**

Mark `VERCEL_MIGRATION_HANDOFF.md` status from `NOT STARTED` → `MIGRATED — VPS DECOM PENDING (decom after 2026-06-02)`.

Edit `VERCEL_MIGRATION_HANDOFF.md` line 6 from:
```
> **Status**: NOT STARTED.
```
to:
```
> **Status**: MIGRATED on 2026-05-26 — VPS decom pending (no earlier than 2026-06-02).
```

And in the table on line 12, change the last column from `NOT STARTED` to `MIGRATED`.

- [ ] **Step 4: Commit the status update**

Run:
```bash
git add VERCEL_MIGRATION_HANDOFF.md
git commit -m "docs: mark solis-web Vercel migration as completed"
```

- [ ] **Step 5: Push and open a PR**

Run:
```bash
git push origin chore/vercel-migration
gh pr create --base main --head chore/vercel-migration \
  --title "chore: migrate solis-web from VPS to Vercel" \
  --body "$(cat <<'EOF'
## Summary
- Disabled subscribe / digest endpoints (return 503) — SOLIS in maintenance mode, zero subscribers ever recorded
- Added prebuild script + outputFileTracingIncludes so reports/ ships into Vercel serverless functions
- Removed standalone output mode from next.config (Vercel handles bundling)
- Added vercel.json with monorepo install filter
- Replaced subscribe form with "paused" notice linking to RSS/GitHub

## Test plan
- [ ] CI: typecheck + tests pass on web package
- [ ] Preview deploy on Vercel: homepage, /report/[date], /trends, /brain, /api/reports, /feed.xml all functional
- [ ] Production cutover: dig + curl confirm DNS, TLS, content
- [ ] VPS rollback path preserved for 7 days
EOF
)"
```

Expected: PR URL printed.

---

## Self-Review Checklist (run before claiming done)

After all tasks merge:

- [ ] `curl -sI https://solis.rectorspace.com` returns 200 + Vercel headers
- [ ] `curl -s https://solis.rectorspace.com/api/reports` returns latest report JSON
- [ ] `curl -X POST https://solis.rectorspace.com/api/subscribe` returns 503
- [ ] Browser: charts on `/trends` render, graph on `/brain` renders
- [ ] No JS console errors on any page
- [ ] Vercel dashboard shows production deployment as Ready
- [ ] VPS container still running (rollback intact for 7 days)
- [ ] Test count is still ≥ 180 (no test loss)
- [ ] Git log shows: 5 focused commits + 1 PR

---

## Rollback (if anything goes catastrophically wrong)

1. **DNS rollback:** In Cloudflare, delete the CNAME, re-add A record `solis` → `151.245.137.75` (proxied or unproxied — match prior state). Within minutes, traffic returns to VPS.
2. **VPS confirms healthy:** `ssh solis 'docker ps' && curl -sI http://localhost:8001` on the VPS.
3. **Vercel cleanup:** `vercel domains rm solis.rectorspace.com` to release the domain claim.
4. **Investigate, retry.**

---

## Notes for the executor

- This plan assumes the executor reads each step before running it. Do not skip checkpoints.
- All file paths are absolute or repo-root-relative. Working directory throughout: `/Users/rector/local-dev/solis`.
- Two destructive checkpoints (Task 6 — Vercel project link, Task 9 — DNS cutover) require explicit RECTOR confirmation.
- The `vercel.json` `installCommand` uses `--frozen-lockfile` — if you add new deps during the migration, you'll need to regenerate `pnpm-lock.yaml` or the Vercel install will fail. Don't add deps mid-migration.
- The `outputFileTracingIncludes` path is `./reports/**/*.{json,md}` relative to `packages/web/`. If Vercel logs show the bundle missing reports, try the alternative absolute glob in Task 8 Step 4 debugging notes.
