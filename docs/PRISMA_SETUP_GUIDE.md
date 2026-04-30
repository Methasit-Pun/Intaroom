# Prisma + Supabase Integration Setup Guide

## ✅ What Was Configured

This project has been set up to use **Prisma** as the database ORM while keeping **Supabase Auth** for authentication.

### Benefits of This Setup:
- ✅ **Type-safe database queries** with Prisma Client
- ✅ **Better database management** with migrations
- ✅ **Keep Supabase Auth** for authentication (LINE, email, etc.)
- ✅ **Easier database fixes** through Prisma Studio and migrations
- ✅ **Auto-complete and IntelliSense** for database operations

---

## 📋 Setup Steps

### ✅ Step 1: Get Your Supabase Database Password

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **kmninrlubuimhheaegqs**
3. Go to **Project Settings** → **Database**
4. Find the **Connection String** section
5. Copy the **Connection pooling** string (with pgBouncer)
6. Your password is in the connection string

### ✅ Step 2: Update `.env.local`

Replace `[YOUR-DB-PASSWORD]` in these two lines with your actual database password:

```env
DATABASE_URL="postgresql://postgres.kmninrlubuimhheaegqs:[YOUR-DB-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.kmninrlubuimhheaegqs:[YOUR-DB-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

**Important:** 
- `DATABASE_URL` uses port **6543** (connection pooling - for queries)
- `DIRECT_URL` uses port **5432** (direct connection - for migrations)

### ✅ Step 3: Install Dependencies (if not done)

```bash
npm install @prisma/client
npm install -D prisma
```

### ✅ Step 4: Generate Prisma Client

After updating your password in `.env.local`, run:

```bash
npx prisma generate
```

This will generate the Prisma Client based on your schema.

### ✅ Step 5: Pull Existing Schema (Optional)

To sync your Prisma schema with the actual Supabase database:

```bash
npx prisma db pull
```

This will update `prisma/schema.prisma` with the actual database structure.

### ✅ Step 6: View Database with Prisma Studio

To open a visual database browser:

```bash
npx prisma studio
```

This opens at `http://localhost:5555` - you can view and edit data directly!

---

## 🔧 Using Prisma in Your Code

### Example: Query Users (Before vs After)

**Before (Supabase Client):**
```typescript
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
```

**After (Prisma):**
```typescript
import prisma from '@/lib/prisma'

const user = await prisma.profile.findUnique({
  where: { id: userId }
})
```

### Example: Create Reservation

**Prisma:**
```typescript
import prisma from '@/lib/prisma'

const reservation = await prisma.reservation.create({
  data: {
    booking_name: 'Meeting Room',
    room_id: 1,
    user_id: userId,
    date: new Date('2026-05-01'),
    start_time: new Date('2026-05-01T09:00:00'),
    end_time: new Date('2026-05-01T10:00:00'),
    status: 'Pending',
    purpose: 'Team Meeting'
  }
})
```

### Example: Get Reservations with Relations

**Prisma:**
```typescript
import prisma from '@/lib/prisma'

const reservations = await prisma.reservation.findMany({
  where: { user_id: userId },
  include: {
    room: true,  // Include room details
    user: true   // Include user profile
  },
  orderBy: { date: 'desc' }
})
```

---

## 🔐 Authentication Strategy

**Keep using Supabase for authentication:**
- ✅ Use `@supabase/auth-helpers-nextjs` for auth
- ✅ Use Supabase for LINE login, email auth, sessions
- ✅ Use Prisma for database operations (CRUD)

**Example: Get current user's profile**
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import prisma from '@/lib/prisma'

// Get auth user from Supabase
const supabase = createClientComponentClient()
const { data: { user } } = await supabase.auth.getUser()

// Get profile from database using Prisma
const profile = await prisma.profile.findUnique({
  where: { id: user.id }
})
```

---

## 🛠️ Common Prisma Commands

### Generate Client (after schema changes)
```bash
npx prisma generate
```

### Pull schema from database
```bash
npx prisma db pull
```

### Push schema changes to database
```bash
npx prisma db push
```

### Create a migration
```bash
npx prisma migrate dev --name your_migration_name
```

### Apply migrations (production)
```bash
npx prisma migrate deploy
```

### Open Prisma Studio (database GUI)
```bash
npx prisma studio
```

### Reset database (⚠️ deletes all data!)
```bash
npx prisma migrate reset
```

---

## 📝 Migration Strategy

### For Development:
Use `npx prisma db push` for quick schema updates without creating migration files.

### For Production:
1. Make schema changes in `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name add_new_field`
3. Test locally
4. Commit migration files
5. Deploy: `npx prisma migrate deploy`

---

## 🐛 Fixing Database Issues

### Issue: Email verification not working

**Before (complex SQL triggers):**
- Had to write SQL triggers in Supabase
- Hard to debug and maintain

**After (with Prisma):**
```typescript
// In your API route
import prisma from '@/lib/prisma'

// Auto-confirm user email
await prisma.profile.update({
  where: { id: userId },
  data: { email_verified: true }
})
```

### Issue: Inconsistent data

**Use Prisma Studio:**
```bash
npx prisma studio
```
- View all tables
- Edit data directly
- See relationships visually
- Export/import data

---

## 🔄 Migrating Existing Code

### Priority Files to Update:

1. **`lib/reservation-utils.ts`** - Replace Supabase queries with Prisma
2. **`lib/admin-api.ts`** - Use Prisma for admin operations
3. **API routes** in `app/api/` - Replace database operations

### Example Migration:

**File: `app/api/reservations/route.ts`**

```typescript
// OLD
import { supabase } from '@/lib/supabase'
export async function GET() {
  const { data } = await supabase.from('reservations').select('*')
  return Response.json(data)
}

// NEW
import prisma from '@/lib/prisma'
export async function GET() {
  const data = await prisma.reservation.findMany()
  return Response.json(data)
}
```

---

## 📊 Schema Files

- **Main schema**: `prisma/schema.prisma`
- **Prisma client**: Auto-generated in `node_modules/@prisma/client`
- **Client singleton**: `lib/prisma.ts` (prevents connection issues)

---

## ⚠️ Important Notes

### Connection Pooling
- Supabase uses **PgBouncer** for connection pooling
- DATABASE_URL (port 6543) is for queries
- DIRECT_URL (port 5432) is for migrations
- Never use DIRECT_URL in production code

### Auth Schema
- Prisma **cannot manage** the `auth` schema (Supabase-managed)
- Keep using Supabase Auth for authentication
- Use Prisma only for `public` schema tables

### Type Safety
- Prisma generates TypeScript types automatically
- Import types: `import { Profile, Reservation } from '@prisma/client'`
- Get autocomplete in your IDE

---

## 🚀 Next Steps

1. ✅ Get database password from Supabase
2. ✅ Update `.env.local` with password
3. ✅ Run `npx prisma generate`
4. ✅ Test connection: `npx prisma studio`
5. 🔄 Start migrating code to use Prisma
6. 🎯 Fix email verification issue using Prisma

---

## 📚 Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **Supabase + Prisma**: https://www.prisma.io/docs/guides/database/supabase
- **Prisma Schema Reference**: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference
- **Prisma Client API**: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference

---

## 🎉 You're All Set!

Your project now has:
- ✅ Prisma configured and ready
- ✅ Type-safe database operations
- ✅ Supabase Auth still working
- ✅ Better debugging tools (Prisma Studio)
- ✅ Easier database management

Start by generating the client and exploring your database in Prisma Studio! 🚀
