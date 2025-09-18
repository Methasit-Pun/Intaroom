-- ============================================
-- DATABASE MIGRATIONS AND FIXES
-- ============================================
-- This file contains database updates, patches, policy fixes,
-- and migration scripts for existing installations

-- ============================================
-- SCHEMA UPDATES AND COLUMN ADDITIONS
-- ============================================

-- Add LINE user ID column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'line_user_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN line_user_id TEXT UNIQUE;
  END IF;
END $$;

-- Add username column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;
  END IF;
END $$;

-- Add telephone and credits fields to profiles table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'telephone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN telephone TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'credits'
  ) THEN
    ALTER TABLE profiles ADD COLUMN credits INTEGER DEFAULT 100;
  END IF;
END $$;

-- Add avatar_url column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Add user ban fields to profiles table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_banned BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ban_reason TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'ban_until'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ban_until TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add QR code URL column to reservations table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' AND column_name = 'qr_code_url'
  ) THEN
    ALTER TABLE reservations ADD COLUMN qr_code_url TEXT;
  END IF;
END $$;

-- Add admin notes and rejection reason to reservations table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE reservations ADD COLUMN admin_notes TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE reservations ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- ============================================
-- DATA FIXES AND CLEANUP
-- ============================================

-- Fix existing users with null usernames
UPDATE profiles 
SET username = CASE 
  WHEN line_user_id IS NOT NULL THEN 'line_' || line_user_id
  WHEN email IS NOT NULL THEN 
    CASE 
      WHEN email LIKE '%@%' THEN split_part(email, '@', 1)
      ELSE 'user_' || SUBSTRING(id::text, 1, 8)
    END
  ELSE 'user_' || SUBSTRING(id::text, 1, 8)
END
WHERE username IS NULL OR username = '';

-- Ensure unique usernames by adding suffix if needed
DO $$
DECLARE
  rec RECORD;
  new_username TEXT;
  counter INTEGER;
BEGIN
  FOR rec IN 
    SELECT id, username 
    FROM profiles 
    WHERE username IN (
      SELECT username 
      FROM profiles 
      GROUP BY username 
      HAVING COUNT(*) > 1
    )
    ORDER BY created_at
  LOOP
    counter := 1;
    new_username := rec.username || '_' || counter;
    
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = new_username AND id != rec.id) LOOP
      counter := counter + 1;
      new_username := rec.username || '_' || counter;
    END LOOP;
    
    UPDATE profiles SET username = new_username WHERE id = rec.id;
  END LOOP;
END $$;

-- Update default credits value for existing users who have 0 or null credits
UPDATE profiles 
SET credits = 100 
WHERE credits IS NULL OR credits = 0;

-- Update the default credits value for new users
ALTER TABLE profiles ALTER COLUMN credits SET DEFAULT 100;

-- Fix email_verified status for existing users
UPDATE profiles 
SET email_verified = true 
WHERE email_verified = false 
AND id IN (
  SELECT id FROM auth.users 
  WHERE email_confirmed_at IS NOT NULL
);

-- Ensure LINE users have proper credits
UPDATE profiles 
SET credits = CASE 
  WHEN credits IS NULL OR credits = 0 THEN 100
  ELSE credits
END
WHERE line_user_id IS NOT NULL;

-- ============================================
-- RLS POLICY FIXES AND UPDATES
-- ============================================

-- Disable RLS temporarily for major updates (re-enable after fixes)
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- Clean up any problematic or conflicting policies
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  -- Drop all existing policies on profiles table
  FOR policy_name IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON profiles';
  END LOOP;
END $$;

-- Re-enable RLS (policies will be created by auth-and-users.sql)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Fix any recursive policy issues by updating the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Use SECURITY DEFINER to bypass RLS during profile creation
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    email_verified,
    username,
    telephone,
    line_user_id,
    avatar_url,
    credits
  )
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      ''
    ),
    new.email,
    'user',
    CASE
      WHEN new.raw_user_meta_data->>'line_user_id' IS NOT NULL THEN true
      WHEN new.email_confirmed_at IS NOT NULL THEN true
      ELSE false
    END,
    COALESCE(
      new.raw_user_meta_data->>'username',
      CASE
        WHEN new.raw_user_meta_data->>'line_user_id' IS NOT NULL
        THEN 'line_' || new.raw_user_meta_data->>'line_user_id'
        ELSE 'user_' || SUBSTRING(new.id::text, 1, 8)
      END
    ),
    COALESCE(new.raw_user_meta_data->>'telephone', new.raw_user_meta_data->>'phone'),
    new.raw_user_meta_data->>'line_user_id',
    new.raw_user_meta_data->>'avatar_url',
    100 -- Default credits
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE
      WHEN EXCLUDED.full_name != '' AND EXCLUDED.full_name IS NOT NULL THEN EXCLUDED.full_name
      ELSE profiles.full_name
    END,
    line_user_id = COALESCE(EXCLUDED.line_user_id, profiles.line_user_id),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    email_verified = EXCLUDED.email_verified,
    telephone = COALESCE(EXCLUDED.telephone, profiles.telephone),
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RESERVATION SYSTEM FIXES
-- ============================================

-- Fix any reservation data inconsistencies
UPDATE reservations 
SET status = 'Pending' 
WHERE status IS NULL OR status = '';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================
-- VERIFICATION AND CLEANUP SCRIPTS
-- ============================================

-- Verify profiles table structure and data integrity
DO $$
DECLARE
  profile_count INTEGER;
  missing_usernames INTEGER;
  missing_emails INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM profiles;
  SELECT COUNT(*) INTO missing_usernames FROM profiles WHERE username IS NULL;
  SELECT COUNT(*) INTO missing_emails FROM profiles WHERE email IS NULL;
  
  RAISE NOTICE 'Profiles table verification:';
  RAISE NOTICE 'Total profiles: %', profile_count;
  RAISE NOTICE 'Missing usernames: %', missing_usernames;
  RAISE NOTICE 'Missing emails: %', missing_emails;
  
  IF missing_usernames > 0 THEN
    RAISE WARNING 'Found profiles with missing usernames. Run username fix script.';
  END IF;
  
  IF missing_emails > 0 THEN
    RAISE WARNING 'Found profiles with missing emails. Data may be corrupted.';
  END IF;
END $$;

-- Clean up any orphaned records
DELETE FROM profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Verify complete registration flow
DO $$
DECLARE
  user_count INTEGER;
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  SELECT COUNT(*) INTO profile_count FROM profiles;
  
  RAISE NOTICE 'Registration flow verification:';
  RAISE NOTICE 'Auth users: %', user_count;
  RAISE NOTICE 'Profile records: %', profile_count;
  
  IF user_count != profile_count THEN
    RAISE WARNING 'Mismatch between auth.users and profiles. Some users may not have profiles.';
  END IF;
END $$;

-- ============================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================

-- Update table statistics for better query planning
ANALYZE profiles;
ANALYZE reservations;
ANALYZE rooms;

-- Vacuum tables to reclaim space and update statistics
VACUUM ANALYZE profiles;
VACUUM ANALYZE reservations;

-- ============================================
-- FINAL MIGRATION NOTES
-- ============================================

/*
MIGRATION NOTES:
1. Run database-schema.sql first to create the base structure
2. Run auth-and-users.sql second to set up authentication and policies
3. Run this file (migrations-and-fixes.sql) last to apply updates and fixes

POST-MIGRATION VERIFICATION:
- Check that all users have usernames: SELECT COUNT(*) FROM profiles WHERE username IS NULL;
- Verify email confirmation status: SELECT COUNT(*) FROM profiles WHERE email_verified = false;
- Check credit balances: SELECT COUNT(*) FROM profiles WHERE credits < 0;
- Verify RLS policies are working: Try accessing data as different user types

TROUBLESHOOTING:
- If RLS policies cause issues, temporarily disable with: ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
- To reset all policies: Run the policy cleanup section of this script
- For performance issues: Check if indexes are being used with EXPLAIN ANALYZE

MAINTENANCE:
- Run VACUUM ANALYZE monthly on high-traffic tables
- Monitor for orphaned records between auth.users and profiles
- Check for expired user bans and clean up automatically
*/