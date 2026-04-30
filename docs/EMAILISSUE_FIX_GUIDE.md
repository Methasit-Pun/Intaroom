# Email Login Issue - Complete Fix Guide

## Problem Summary
Users cannot login using email because the system requires email verification, but there are configuration issues.

## Root Causes Found

### 1. **Missing Email Confirmation Trigger** ❌
- When users click the verification link, `auth.users.email_confirmed_at` is updated
- BUT there's no trigger to sync this to `profiles.email_verified`
- This causes inconsistencies in the database

### 2. **Supabase Email Configuration** ⚠️
The email verification redirect URL needs to be properly configured in Supabase Dashboard.

### 3. **Email Service Not Enabled** ⚠️
Supabase's email service might not be properly configured.

---

## **SOLUTION OPTIONS**

### **Option A: Fix Email Verification (Recommended for Production)**

#### Step 1: Run Database Fix
Run the SQL script in your Supabase SQL Editor:

```bash
# The script is located at:
db_setup/fix-email-verification.sql
```

This will:
- ✅ Create a trigger to automatically update `profiles.email_verified` when users confirm their email
- ✅ Sync existing users who already confirmed but have `email_verified = false`

#### Step 2: Configure Supabase Email Settings

1. **Go to Supabase Dashboard** → Your Project → **Authentication** → **URL Configuration**

2. **Set Site URL:**
   - Production: `https://intaroomv2.vercel.app`

3. **Add Redirect URLs:**
   - `https://intaroomv2.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

4. **Configure Email Templates:**
   - Go to **Authentication** → **Email Templates**
   - Select **Confirm signup** template
   - Ensure the link uses: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_confirmation`

5. **Enable Email Confirmations:**
   - Go to **Authentication** → **Providers** → **Email**
   - Ensure **"Confirm email"** is **ENABLED**

#### Step 3: Test Email Flow
1. Register a new user
2. Check your email inbox (including spam folder)
3. Click the verification link
4. Should redirect to login page with success message
5. Try logging in - should work!

---

### **Option B: Disable Email Verification (Quick Fix - Development Only)**

If you need users to login immediately without email verification:

#### Step 1: Auto-confirm ALL existing users

Run this in Supabase SQL Editor:

```sql
-- Auto-confirm all auth users
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- Update profiles to match
UPDATE public.profiles
SET email_verified = true
WHERE email_verified = false;
```

#### Step 2: Disable Email Confirmation Requirement in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
2. **Disable** the **"Confirm email"** toggle
3. Save changes

⚠️ **Warning:** This is less secure and should only be used in development or internal applications.

---

### **Option C: Hybrid Approach (Auto-confirm Development, Require Production)**

You can automatically confirm emails for certain domains (like test accounts):

```sql
-- Auto-confirm only test/development emails
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL 
AND (
  email LIKE '%@test.com' OR 
  email LIKE '%@example.com' OR
  email LIKE '%@dev.local'
);

-- Update their profiles
UPDATE public.profiles
SET email_verified = true
WHERE email_verified = false
AND email IN (
  SELECT email FROM auth.users 
  WHERE email_confirmed_at IS NOT NULL
);
```

---

## **Verification Steps**

After applying any fix, verify it's working:

### 1. Check Database Sync
```sql
SELECT 
  u.email,
  u.email_confirmed_at as auth_confirmed,
  p.email_verified as profile_verified,
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL AND p.email_verified = true THEN '✅ Synced'
    WHEN u.email_confirmed_at IS NOT NULL AND p.email_verified = false THEN '❌ Out of Sync'
    WHEN u.email_confirmed_at IS NULL THEN '⏳ Awaiting Confirmation'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 20;
```

### 2. Test Login
1. Try logging in with an existing user
2. Check browser console for detailed error messages
3. Should see: `✅ Authentication successful`

### 3. Check Supabase Logs
- Go to **Supabase Dashboard** → **Logs** → **Auth Logs**
- Look for failed login attempts or email sending errors

---

## **Common Error Messages & Solutions**

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Please verify your email before logging in" | User hasn't confirmed email | Run Option A or B fixes |
| "Invalid login credentials" | Wrong username/password OR email not found | Check username exists in profiles table |
| "Username not found" | Username doesn't exist in profiles | User might have registered with email only |
| Email verification link doesn't work | Wrong redirect URL | Fix Supabase URL Configuration (Option A, Step 2) |

---

## **Quick Diagnostic Commands**

Run these in Supabase SQL Editor to diagnose issues:

```sql
-- 1. Check unconfirmed users
SELECT COUNT(*) as unconfirmed_users
FROM auth.users 
WHERE email_confirmed_at IS NULL;

-- 2. Check out-of-sync users
SELECT COUNT(*) as out_of_sync
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email_confirmed_at IS NOT NULL 
AND p.email_verified = false;

-- 3. Check if email confirmation trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_email_confirmed';

-- 4. Find specific user's status
SELECT 
  u.email,
  u.email_confirmed_at,
  p.email_verified,
  p.username
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'user@example.com'; -- Replace with actual email
```

---

## **Recommended Next Steps**

1. ✅ Run database fix script (`fix-email-verification.sql`)
2. ✅ Configure Supabase email settings properly
3. ✅ Test with a new user registration
4. ✅ Verify existing users can now login
5. ✅ Monitor auth logs for any remaining issues

---

## **Need More Help?**

If users still can't login after applying these fixes:
1. Check the browser console for specific error messages
2. Check Supabase Auth Logs in dashboard
3. Verify the user exists: `SELECT * FROM profiles WHERE email = 'user@example.com'`
4. Test with both username and email login methods
