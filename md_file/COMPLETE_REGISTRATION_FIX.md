# Complete Registration Flow Fix

## Overview
This fix ensures that when users register and verify their email, they are properly redirected to the production URL and all registration data is correctly transferred to the profiles table.



## Key Changes Made

### 1. Email Verification Redirect ✅
**File**: `app/auth/callback/route.ts`

- Updated all redirects to use production URL: `https://intaroomv2.vercel.app/`
- Added proper error handling for auth callback failures
- Separate handling for email confirmation vs password recovery

### 2. Database Trigger Enhancement ✅
**File**: `fix_complete_registration_flow.sql`

- **Enhanced `handle_new_user()` function** to capture ALL registration data:
  - `full_name` from registration form
  - `username` from registration form  
  - `email` from auth.users
  - `email_verified` status
  - `telephone` and `phone` fields (both supported)
  - `credits` (default 100)
  - `role` (default 'user')
  - Timestamps (`created_at`, `updated_at`)

- **New `handle_email_confirmation()` function** to update `email_verified` when user confirms email

- **Two triggers**:
  - `on_auth_user_created` - Fires when user registers
  - `on_auth_user_email_confirmed` - Fires when email is verified

### 3. Registration Form Update ✅
**File**: `app/register/page.tsx`

- Updated `emailRedirectTo` to use production URL with proper callback type
- Removed manual profile creation (relies on database trigger)
- Simplified flow to prevent conflicts

### 4. Database Schema Alignment ✅
**File**: `fix_complete_registration_flow.sql`

Ensures profiles table has ALL required columns matching your schema:
- `id` (uuid) - Primary key
- `full_name` (text) - User's full name
- `email` (text) - User's email
- `role` (text) - User role (default: 'user')
- `phone` (text) - Phone number field
- `email_verified` (bool) - Email verification status
- `created_at` (timestamptz) - Record creation time
- `updated_at` (timestamptz) - Last update time  
- `username` (text) - Unique username
- `telephone` (text) - Alternative phone field
- `credits` (int4) - User credits (default: 100)
- `line_user_id` (text) - LINE integration
- `avatar_url` (text) - Profile picture URL

### 5. RLS Policies ✅
Added proper Row Level Security policies:
- Users can insert their own profile
- Users can view their own profile  
- Users can update their own profile

## Complete Registration Flow

```
1. User fills registration form (/register)
   ↓
2. Form sends data to Supabase auth.signUp() with user metadata
   ↓
3. Supabase creates user in auth.users table
   ↓
4. Database trigger (handle_new_user) automatically creates profile record
   ↓
5. User receives verification email
   ↓
6. User clicks email verification link
   ↓
7. Redirected to: https://intaroomv2.vercel.app/auth/callback
   ↓
8. Callback handler processes verification
   ↓
9. Database trigger (handle_email_confirmation) updates email_verified = true
   ↓
10. User redirected to: https://intaroomv2.vercel.app/login?verified=true
```

## Deployment Steps

### 1. Apply Database Changes
```sql
-- Run this in your Supabase SQL editor:
\i fix_complete_registration_flow.sql
```

### 2. Verify Setup
```sql
-- Run this to verify everything is working:
\i verify_complete_registration_flow.sql
```

### 3. Test Registration Flow
1. Register a new user with username and full name
2. Check email for verification link
3. Click verification link
4. Verify redirect to production URL
5. Check that profile was created with all data
6. Verify email_verified is set to true after confirmation

## Data Mapping

| Registration Form Field | Database Column | Source |
|------------------------|-----------------|---------|
| Full Name | `full_name` | `raw_user_meta_data->>'full_name'` |
| Username | `username` | `raw_user_meta_data->>'username'` |
| Email | `email` | `auth.users.email` |
| Email Verified | `email_verified` | `auth.users.email_confirmed_at` |
| Role | `role` | Default: 'user' |
| Credits | `credits` | Default: 100 |
| Created At | `created_at` | NOW() |
| Updated At | `updated_at` | NOW() |

## Troubleshooting

### If profiles are not being created:
1. Check if triggers exist: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%auth_user%';`
2. Check function exists: `SELECT * FROM information_schema.routines WHERE routine_name = 'handle_new_user';`
3. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'profiles';`

### If email verification doesn't update email_verified:
1. Check if email confirmation trigger exists
2. Verify the handle_email_confirmation function
3. Test by manually updating auth.users.email_confirmed_at

### If redirects don't work:
1. Verify production URL in auth callback
2. Check Supabase project settings for redirect URLs
3. Ensure https://intaroomv2.vercel.app/auth/callback is in allowed redirect URLs

## Testing Checklist

- [ ] User can register with username and full name
- [ ] Profile record is created automatically
- [ ] Email verification link works
- [ ] Email verification redirects to production URL
- [ ] email_verified field is updated after verification
- [ ] User can login after email verification
- [ ] All profile data is properly stored
- [ ] No duplicate profiles are created
- [ ] RLS policies work correctly
