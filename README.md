# Intaroom — Room Reservation System

A full-stack room booking platform built for the Intania (Faculty of Engineering, Chulalongkorn University) community. Users log in via LINE or email/password, browse available rooms, and submit reservation requests. Admins review and approve bookings through a separate dashboard.

**Live:** https://intaroom.vercel.app  
**Stack:** Next.js 15 · TypeScript · Supabase · LINE LIFF · Tailwind CSS · Vercel

---

## Table of Contents

1. [How the App Works](#how-the-app-works)
2. [Authentication Architecture](#authentication-architecture)
3. [Project Structure](#project-structure)
4. [Local Development Setup](#local-development-setup)
5. [Database Setup](#database-setup)
6. [Admin Account Setup](#admin-account-setup)
7. [Running Tests](#running-tests)
8. [Deployment](#deployment)
9. [Known Issues & What to Do Next](#known-issues--what-to-do-next)

---

## How the App Works

There are **two separate user types** with completely different auth flows:

### Regular Users
1. Visit `/login`, choose "User" tab
2. Log in with **LINE** (via LIFF) or **email + password** (Supabase Auth)
3. First-time users complete a profile (full name, telephone) at `/profile`
4. Browse rooms at `/` → submit a reservation at `/reserve`
5. View booking history and QR codes at `/my-reservations`
6. Reservation status: **Pending → Approved/Rejected** (admin decides)

### Admin Users
1. Visit `/login`, choose "Admin" tab
2. Log in with username + password (stored in `admin_profiles` Supabase table, hashed with **bcrypt**)
3. Server sets an **HttpOnly `isAdmin` cookie** (7-day expiry)
4. Admin sees `/admin` dashboard: manage reservations, approve/reject, view analytics, generate QR codes
5. `/admin/calendar` — visual calendar view of all bookings
6. `/admin/qr-generator` — manual QR code generation

### Reservation Lifecycle

```
User submits → status: "pending"
Admin approves → status: "approved" → QR code generated
Admin rejects  → status: "rejected"
User cancels   → status: "cancelled"
```

---

## Authentication Architecture

This is the most important thing to understand before touching auth code.

### Two auth systems run in parallel

| | Regular Users | Admin Users |
|---|---|---|
| **Credential store** | Supabase Auth (built-in) | `admin_profiles` table (bcrypt hash) |
| **Session token** | Supabase session cookie | HttpOnly `isAdmin` cookie |
| **LINE support** | Yes (LIFF) | No |
| **Middleware guard** | Supabase session check | `isAdmin` cookie check |

### How the middleware works (`proxy.ts`)

`proxy.ts` is the auth guard for every route. Next.js treats files named `middleware.ts` specially — but this project names it `proxy.ts` and registers it via `vitest.config.ts` and `__tests__/proxy.test.ts`. The function `proxy()` runs on every request before the page renders.

```
Request
  │
  ├─ /_next/*, /api/*, static files → pass through (no auth check)
  │
  ├─ /admin/* ──→ isAdmin cookie === "true"? → allow
  │               └─ else: check Supabase session + profiles.role === "admin"
  │                    └─ else: redirect /login
  │
  ├─ /login, /register, /forgot-password, /auth/* → allow (public)
  │
  └─ everything else → valid Supabase session? → allow
                         └─ else: redirect /login?redirectedFrom=<path>
```

### Admin login flow (step by step)

```
POST /api/admin/login
  1. Rate limit check (5 attempts / 15 min per IP, in-memory)
  2. Look up username in admin_profiles table (via service role key, bypasses RLS)
  3. bcrypt.compare(password, stored_hash)
  4. On success → set HttpOnly isAdmin=true cookie (SameSite=Strict, 7 days)

GET /api/admin/verify
  → reads isAdmin cookie server-side → { isAdmin: true/false }
  → used by client components to check auth without touching localStorage

POST /api/admin/logout
  → clears the isAdmin cookie
```

**Important:** Admin auth does NOT use `localStorage`. Any code that reads `localStorage.getItem("isAdmin")` is a bug — the check was removed in April 2025. Always use `fetch("/api/admin/verify")` instead.

### `lib/admin-auth.ts`

Contains two server-side helpers:
- `getAdminSession(req, res)` — used in `proxy.ts` middleware, checks Supabase session + `profiles.role`
- `requireAdmin()` — used in Server Components/Route Handlers, redirects to `/login` if not admin

---

## Project Structure

```
Intaroom/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, providers)
│   ├── page.tsx                  # Home / room listing
│   ├── env.ts                    # Validates + exports env vars at startup
│   ├── globals.css
│   │
│   ├── admin/                    # Admin-only pages (guarded by proxy.ts)
│   │   ├── page.tsx              # Main dashboard (reservations table + analytics)
│   │   ├── calendar/             # Calendar view of all bookings
│   │   └── qr-generator/         # Manual QR code generation
│   │
│   ├── api/
│   │   └── admin/
│   │       ├── login/route.ts    # POST — bcrypt verify, sets isAdmin cookie
│   │       ├── logout/route.ts   # POST — clears isAdmin cookie
│   │       └── verify/route.ts   # GET  — checks isAdmin cookie server-side
│   │
│   ├── login/page.tsx            # Login page (user + admin tabs)
│   ├── register/                 # Email registration
│   ├── profile/                  # User profile setup
│   ├── reserve/                  # Reservation form
│   ├── my-reservations/          # User's booking history + QR codes
│   ├── reservation-details/      # Single reservation detail
│   ├── summary/                  # Booking summary
│   └── auth/callback/            # Supabase OAuth callback
│
├── components/
│   ├── ui/                       # shadcn/ui primitives (button, card, chart, …)
│   ├── auth-wrapper.tsx          # Client-side auth guard for user pages
│   ├── liff-provider.tsx         # LINE LIFF context
│   ├── logout-button.tsx         # Handles both user and admin logout
│   └── line-profile.tsx          # Displays LINE user info
│
├── lib/
│   ├── admin-auth.ts             # Server-side admin auth helpers
│   ├── admin-api.ts              # Admin data fetching utilities
│   ├── supabase.ts               # Supabase client (browser + server)
│   ├── reservation-utils.ts      # Booking conflict detection, validation
│   ├── user-validation.ts        # User input validation helpers
│   ├── cors.ts                   # CORS header utilities
│   └── utils.ts                  # General utilities (cn, etc.)
│
├── hooks/
│   ├── use-mobile.tsx            # Responsive breakpoint hook
│   ├── use-telephone-validation.tsx
│   └── use-toast.ts
│
├── __tests__/
│   ├── proxy.test.ts             # Middleware auth guard tests
│   ├── setup.ts                  # Vitest global mocks (next/server, Supabase)
│   ├── api/admin/                # Admin API route tests
│   └── lib/                      # Unit tests for lib utilities
│
├── db_setup/
│   ├── DATABASE_SETUP.md         # Step-by-step DB setup guide
│   ├── database-schema.sql       # Core tables
│   ├── auth-and-users.sql        # Auth + profiles setup
│   ├── migrations-and-fixes.sql  # Incremental migrations
│   └── fix-reservations-profiles-relationship.sql
│
├── scripts/
│   ├── generate-qr-codes.js      # CLI script to bulk-generate QR codes
│   └── test-admin-performance.js # Manual perf testing script
│
├── docs/                         # Extended developer documentation
│   ├── ADMIN_DASHBOARD_OPTIMIZATION.md
│   ├── SUPABASE_AUTH_CONFIG.md
│   └── …
│
├── proxy.ts                      # Auth middleware (runs on every request)
├── next.config.mjs               # Security headers, image config
├── vercel.json                   # Vercel region (sin1), headers
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm (the only lock file is `package-lock.json` — don't use pnpm or yarn)
- A Supabase project
- (Optional) A LINE Developers account for LIFF

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

Copy from the example and fill in real values:

```bash
cp .env.example .env.local
```

| Variable | Where to find it | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (secret) | Yes |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL or `http://localhost:3000` | Yes |
| `NEXT_PUBLIC_LIFF_ID` | LINE Developers console | No |

**Never commit `.env.local` or any file containing the service role key.**

### 3. Run the dev server

```bash
npm run dev
```

Visit http://localhost:3000

---

## Database Setup

All SQL lives in `db_setup/`. Run these in order in the **Supabase SQL Editor**:

```
1. database-schema.sql              — tables: rooms, reservations, profiles, admin_profiles
2. auth-and-users.sql               — RLS policies, triggers for new user profiles
3. migrations-and-fixes.sql         — incremental changes (safe to re-run)
4. fix-reservations-profiles-relationship.sql  — FK fix (run if you see relation errors)
```

Read `db_setup/DATABASE_SETUP.md` for the full annotated walkthrough.

### Key tables

| Table | Purpose |
|---|---|
| `profiles` | Regular user profiles linked to Supabase Auth (`id` = auth.users.id) |
| `admin_profiles` | Admin accounts: `username`, `password_hash` (bcrypt) |
| `rooms` | Room definitions (name, capacity, image, description) |
| `reservations` | Bookings: FK to profiles + rooms, status field |

---

## Admin Account Setup

Admin credentials are stored in the `admin_profiles` table as **bcrypt hashes**. There is no sign-up flow — an admin must insert the row manually.

### Generate a bcrypt hash

```bash
node -e "const b = require('bcryptjs'); b.hash('YOUR_PASSWORD', 12).then(console.log)"
```

### Insert the admin row in Supabase SQL Editor

```sql
INSERT INTO admin_profiles (username, password_hash)
VALUES ('your_username', '$2a$12$...(bcrypt hash here)...');
```

### Test the login

Go to `/login` → Admin tab → enter username + password.  
On success, the server sets an HttpOnly `isAdmin` cookie and redirects to `/admin`.

---

## Running Tests

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
npm run test:coverage # coverage report → coverage/
```

Tests use **Vitest** with Node environment. The test suite covers:
- `proxy.ts` middleware — all auth scenarios (cookie, Supabase fallback, public routes)
- `lib/admin-auth.ts` — `getAdminSession` and `requireAdmin`
- `lib/cors.ts`, `lib/reservation-utils.ts`, filter/state utilities
- Admin API routes

Coverage thresholds are set in `vitest.config.ts` (80% lines/branches).

---

## Deployment

The app deploys to **Vercel** (Singapore region, `sin1`).

### Steps

1. Push to `main` → Vercel auto-deploys
2. Set all environment variables in Vercel → Settings → Environment Variables
3. In Supabase → Authentication → URL Configuration:
   - **Site URL:** `https://intaroom.vercel.app`
   - **Redirect URLs:** `https://intaroom.vercel.app/auth/callback`

### Security headers

Set in both `next.config.mjs` (dev + prod) and `vercel.json` (prod):
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- CORS restricted to same origin for `/api/admin/*`

---

## Known Issues & What to Do Next

### Must fix before scaling

| Issue | Detail |
|---|---|
| **In-memory rate limiter** | `app/api/admin/login/route.ts` uses a module-level `Map` for rate limiting. This resets on every cold start and doesn't share state across Vercel instances. Replace with [Upstash Rate Limit](https://github.com/upstash/ratelimit) + Redis when traffic increases. |
| **No real middleware file** | `proxy.ts` is a manually-named middleware. Next.js only auto-runs `middleware.ts` at the root. Check whether `proxy.ts` is being wired up correctly — if not, rename it to `middleware.ts` and update `vitest.config.ts` imports. |
| **`admin_profiles` password migration** | If the database still has SHA-256 hashes (old format), they must be re-generated as bcrypt before login works. See [Admin Account Setup](#admin-account-setup). |

### Nice to have

| Feature | Notes |
|---|---|
| **Email notifications** | Send confirmation/rejection emails to users. Supabase has an Edge Functions trigger system. |
| **Real-time status updates** | Use Supabase Realtime to push reservation status changes to users without polling. |
| **LINE push notifications** | When a reservation is approved/rejected, send a LINE message via the LINE Messaging API. |
| **Pagination on admin dashboard** | The dashboard loads all reservations; add server-side pagination for large datasets. |
| **Room image uploads** | Currently room images are stored as URLs. Add Supabase Storage for direct uploads. |
| **Multi-language support** | UI is Thai/English mixed. Pick one or add i18n. |

### Package manager

Only use **npm**. `package-lock.json` is the single lock file. Do not run `pnpm install` or `yarn` — it will generate a second lock file and cause version drift.

---

## Key Conventions

- **No `localStorage` for auth state.** Use `fetch("/api/admin/verify")` to check admin session. Use Supabase `getSession()` for user session.
- **Server-side secrets.** Only `NEXT_PUBLIC_*` vars are available in the browser. `SUPABASE_SERVICE_ROLE_KEY` must never appear in client code.
- **`app/env.ts`** validates required env vars at startup — if a required var is missing the server throws immediately rather than failing silently at runtime.
- **Commit style:** `type: short description` — types are `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.
