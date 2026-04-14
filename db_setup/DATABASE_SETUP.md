# Database SQL Files Organization

This project now uses 3 organized SQL files instead of multiple scattered files. Run them in the specified order for proper database setup.

## 📁 File Structure

### 1. `database-schema.sql` - Core Database Structure
**Run this FIRST**
- Creates all tables (profiles, rooms, reservations, admin_profiles, etc.)
- Sets up core functions and triggers
- Establishes basic database schema
- Includes initial data setup (sample rooms, features)

**Contains:**
- Profiles table with all columns (username, credits, line_user_id, etc.)
- Rooms and room features tables
- Reservations table with QR code support
- Admin table for direct admin auth (username + SHA-256 password_hash)
- Core functions (handle_new_user, check_username_exists, etc.)
- Triggers for automated user handling

### 2. `auth-and-users.sql` - Authentication & User Management
**Run this SECOND**
- Sets up Row Level Security (RLS) policies
- Creates admin users and test users
- Configures authentication flows
- Sets up user management functions

**Contains:**
- RLS policies for all tables
- Admin user creation (admin1/admin123)
- Test user setup for development
- User ban/unban functions
- Credit management functions
- Email confirmation settings

### 3. `migrations-and-fixes.sql` - Updates & Patches
**Run this LAST**
- Applies schema updates and column additions
- Fixes data inconsistencies
- Updates existing installations
- Performance optimizations

**Contains:**
- Column additions with existence checks
- Data cleanup and fixes
- Username generation for existing users
- Policy cleanup and fixes
- Performance indexes
- Verification scripts

## 🚀 Setup Instructions

### For New Database:
```sql
-- 1. Run in Supabase SQL Editor:
-- Copy and paste content from database-schema.sql

-- 2. Then run:
-- Copy and paste content from auth-and-users.sql

-- 3. Finally run:
-- Copy and paste content from migrations-and-fixes.sql
```

### For Existing Database:
```sql
-- If you already have tables, you can safely run all three files
-- The scripts include IF NOT EXISTS checks and conflict handling

-- 1. Run database-schema.sql (will skip existing tables)
-- 2. Run auth-and-users.sql (will update policies)
-- 3. Run migrations-and-fixes.sql (will add missing columns and fix data)
```

## 🔧 Default Credentials

### Admin Access:
- **Web Login:** admin1 / admin123
- **Database Admin:** Admin_1 / adminpassword123

### Test User:
- **Email:** mb@test.com
- **Password:** abc123

## 📋 Verification

After running all scripts, verify the setup:

```sql
-- Check profiles table structure
\d profiles

-- Verify user data
SELECT COUNT(*) as total_users FROM profiles;
SELECT COUNT(*) as verified_users FROM profiles WHERE email_verified = true;
SELECT COUNT(*) as users_with_usernames FROM profiles WHERE username IS NOT NULL;

-- Check admin setup
SELECT * FROM admin;
SELECT * FROM profiles WHERE role = 'admin';

-- Verify RLS policies
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

## 🗂️ What Was Consolidated

The following individual SQL files were merged into the 3 organized files:

**Schema & Tables:** database.sql, create_profiles_table.sql, create_admin_table.sql, recreate_profiles_table.sql

**Authentication:** create_admin_user.sql, create_test_user.sql, auto_confirm_emails.sql, fix_auth_policies.sql, fix_profiles_rls.sql

**Migrations & Fixes:** add_*.sql, fix_*.sql, update_*.sql, ensure_*.sql, handle_*.sql, verify_*.sql

## 📝 Notes

- All scripts are idempotent (safe to run multiple times)
- Includes comprehensive error handling and data validation
- Optimized for both new installations and existing database updates
- Contains detailed comments explaining each section
- Includes performance indexes and optimization settings