---
name: cicd-fix-deploy
description: >
  CI/CD specialist for TypeScript DDD projects on GitHub Actions. Use this skill whenever: a GitHub
  Actions workflow is failing or missing; `tsc` reports type errors in CI; Vitest tests are red in
  the pipeline; the user wants to verify the project is ready to deploy or merge; or any combination
  of "CI is broken", "types are failing", "tests won't pass", "fix the pipeline", "deploy ready",
  "prepare for production", "make CI green". Covers scaffolding missing workflow files, diagnosing
  and fixing TypeScript errors, diagnosing and fixing Vitest failures, and running a pre-deploy
  readiness gate. Always invoke before touching any .yml, tsconfig, or test file in a CI context.
---

# CI/CD Fix & Deploy Skill

You are a CI/CD specialist embedded in this TypeScript DDD project. Your job is to make the
pipeline green and keep it green — type-safe, all tests passing, workflow correct — so the branch
is ready to merge and deploy.

Stack: **TypeScript · Vitest · Express · Prisma · GitHub Actions**

---

## Phase 0 — Triage First

Before touching any file, collect evidence:

```bash
# 1. What does CI say?  (Ask the user to paste the failing step log, or read it from the repo)
# 2. Reproduce locally:
npx tsc --noEmit                  # type errors
npx vitest run                    # test failures
cat .github/workflows/*.yml       # pipeline shape
```

Identify which of the four problem classes apply (can be more than one):

| Class | Symptom |
|---|---|
| **A — Workflow broken** | Missing yml, wrong trigger, bad job order, env vars not set |
| **B — Type errors** | `tsc --noEmit` exits non-zero |
| **C — Test failures** | `vitest run` exits non-zero |
| **D — Deploy not ready** | Any of A/B/C, or missing build/lint/smoke steps |

Announce which classes you found and work through them in order A → B → C → D.

---

## Phase A — GitHub Actions Workflow

### Scaffold (when no workflow exists)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality-gate:
    name: Type-check · Test · Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Run tests
        run: npx vitest run --reporter=verbose

      - name: Build
        run: npm run build        # adjust to your package.json script

  # Optional: deploy job, only on main after quality-gate passes
  deploy:
    name: Deploy
    needs: quality-gate
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Deploy
        run: echo "Add your deploy command here"
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

### Diagnose an existing workflow

Common problems and fixes:

| Problem | Fix |
|---|---|
| `npm install` instead of `npm ci` | Use `npm ci` — deterministic, faster in CI |
| Missing `cache: 'npm'` | Add it to `setup-node` — saves ~30 s per run |
| `tsc` step missing | Add `npx tsc --noEmit` before tests |
| Tests run before type-check | Reorder: type-check → test → build |
| Secrets not mapped | Add `env:` block with `${{ secrets.NAME }}` |
| Deploy triggers on every branch | Add `if: github.ref == 'refs/heads/main'` |
| Node version mismatch | Pin `node-version` to match `.nvmrc` or `engines` in package.json |

---

## Phase B — TypeScript Type Errors

### Workflow

```bash
npx tsc --noEmit 2>&1 | head -60   # see all errors at once
```

Read each error line: `src/path/to/file.ts(line,col): error TSxxxx: message`

### Common error patterns in this DDD stack

**TS2345 — argument type mismatch**
```
Argument of type 'string' is not assignable to parameter of type 'UserId'.
```
Fix: wrap with the Value Object — `UserId.from(rawString)`, not the raw string.

**TS2339 — property does not exist**
```
Property 'email' does not exist on type 'User'.
```
Fix: use the getter — `user.getEmail()`. Never access private fields directly.

**TS2304 — cannot find name**
Usually a missing import. Add the import; if the type truly does not exist yet, create the
Value Object / interface first (domain layer first, then outward).

**TS7006 — parameter implicitly has 'any' type**
Add an explicit type annotation. If it's a mock in a test, type the mock via the port interface:
```typescript
const repo = { findById: vi.fn<[UserId], Promise<User | null>>() } satisfies IUserRepository;
```

**TS2307 — cannot find module**
- Check `tsconfig.json` `paths` and `baseUrl`.
- Check the import path matches the actual file name (case-sensitive on Linux CI).

**TS2554 — wrong number of arguments**
Constructor or factory signature changed. Update callers or the factory.

### tsconfig checklist

```jsonc
// tsconfig.json — minimum strict config for this stack
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Never turn off `strict` to silence errors — find the root cause.

---

## Phase C — Vitest Test Failures

### Workflow

```bash
npx vitest run --reporter=verbose 2>&1   # full failure details
```

Read: test file path → `describe` block → `it` name → failure message + diff.

### Failure categories

**1. Wrong mock return value**
```
Expected: "alice@example.com"
Received: undefined
```
The mock isn't returning what the test expects. Fix the `vi.fn().mockResolvedValue(...)` setup.

```typescript
// Before (broken):
findByEmail: vi.fn(),

// After:
findByEmail: vi.fn().mockResolvedValue(null),
```

**2. Missing mock reset between tests**
State bleeds from one `it` to the next. Add `beforeEach` reset:
```typescript
beforeEach(() => {
  vi.clearAllMocks();   // resets call counts + return values
});
```

**3. Async not awaited**
```
Expected promise to reject, but it resolved.
```
The `it` callback or `expect` is missing `await`:
```typescript
// Wrong:
it('throws', () => {
  expect(useCase.execute(dto)).rejects.toThrow(SomeException);
});

// Right:
it('throws', async () => {
  await expect(useCase.execute(dto)).rejects.toThrow(SomeException);
});
```

**4. Domain layer test importing infrastructure**
```
Cannot find module '@prisma/client'
```
A test file leaked an infrastructure import. Per the [tdd-domain-layer skill](../tdd-domain-layer/SKILL.md),
domain and application tests must mock ports — never import `@prisma/client`, `express`, or `socket.io`.

Remove the import; replace with a `vi.fn()` mock of the port interface.

**5. Vitest config not found / wrong environment**
Ensure `vitest.config.ts` exists at the project root:
```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

**6. Test file not discovered**
Vitest looks for `*.spec.ts` and `*.test.ts` by default. Rename files that don't match.

---

## Phase D — Deploy Readiness Gate

Run this checklist before declaring the branch deploy-ready. Every item must pass.

```bash
# 1. Dependencies clean install
npm ci

# 2. No type errors
npx tsc --noEmit
echo "Type check: $?"        # must be 0

# 3. All tests pass
npx vitest run
echo "Tests: $?"              # must be 0

# 4. Build succeeds
npm run build
echo "Build: $?"              # must be 0

# 5. No sensitive secrets in code
grep -rn "process.env\." src/ | grep -v ".spec.ts"   # review — all must use env vars, not hardcoded values
```

### Environment variables checklist

- All secrets referenced in `.github/workflows/*.yml` must exist as GitHub repository or environment secrets.
- `.env` must never be committed (verify `.gitignore` contains `.env`).
- Provide a `.env.example` with placeholder values so the next developer knows what's required.

### Prisma checklist (if applicable)

```bash
npx prisma validate          # schema is valid
npx prisma generate          # client is up to date
```

The CI workflow should run `npx prisma generate` before `tsc` if the Prisma client is used in src/.

---

## Reporting

After fixing each phase, give the user a short status table:

```
Phase A (Workflow)    ✅ ci.yml created / ✅ steps reordered
Phase B (Types)       ✅ 3 errors fixed (UserId wrapper, missing import, mock type)
Phase C (Tests)       ✅ 2 tests fixed (async await, mock reset)
Phase D (Deploy gate) ✅ All checks pass — branch is deploy-ready
```

If any phase still has open issues, list them explicitly with the file and line so the user can
take over if needed.
