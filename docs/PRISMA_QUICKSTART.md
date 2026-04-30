# Quick Start - Prisma Setup

## 🚀 Quick 3-Step Setup

### Step 1: Get Your Database Password

1. Go to: https://supabase.com/dashboard/project/kmninrlubuimhheaegqs/settings/database
2. Scroll to **Connection String** → **Connection pooling**
3. Click **Copy** - the string looks like:
   ```
   postgresql://postgres.kmninrlubuimhheaegqs:[YOUR-PASSWORD]@...
   ```
4. Copy the password part (between `:` and `@`)

### Step 2: Update .env.local

Open `.env.local` and replace `[YOUR-DB-PASSWORD]` with your password in these lines:

```env
DATABASE_URL="postgresql://postgres.kmninrlubuimhheaegqs:YOUR_PASSWORD_HERE@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.kmninrlubuimhheaegqs:YOUR_PASSWORD_HERE@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### Step 3: Generate Prisma Client

Run these commands:

```bash
# Generate Prisma Client
npx prisma generate

# Test the connection
npx prisma studio
```

Prisma Studio will open at http://localhost:5555 - if you see your database tables, you're all set! ✅

---

## 🔧 Now You Can Fix the Email Issue!

With Prisma, fixing the email verification is much easier:

### Option 1: Auto-confirm all users (Quick Fix)

Create a script or run in Prisma Studio:

```typescript
import prisma from './lib/prisma'

// Update all unverified users
await prisma.profile.updateMany({
  where: { email_verified: false },
  data: { email_verified: true }
})
```

### Option 2: Fix specific user

```typescript
import prisma from './lib/prisma'

// Find user by email
const user = await prisma.profile.update({
  where: { email: 'user@example.com' },
  data: { email_verified: true }
})
```

---

## 📚 Full Guide

See [PRISMA_SETUP_GUIDE.md](./PRISMA_SETUP_GUIDE.md) for complete documentation.

---

## ⚡ Useful Commands

```bash
# Generate client (after schema changes)
npx prisma generate

# Open database GUI
npx prisma studio

# Pull schema from Supabase
npx prisma db pull

# Push schema changes to database
npx prisma db push
```

---

## 🎯 What's Next?

1. ✅ Complete the 3 steps above
2. 🔍 Open Prisma Studio to explore your database
3. 🛠️ Use Prisma to fix the email verification issue
4. 🚀 Start migrating queries from Supabase Client to Prisma

**Need help?** Check the full guide or ask! 😊
