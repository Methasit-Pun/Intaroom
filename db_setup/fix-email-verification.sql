-- ============================================
-- FIX EMAIL VERIFICATION ISSUE
-- ============================================
-- This script fixes the email login issue by:
-- 1. Creating a trigger to update email_verified when user confirms email
-- 2. Syncing existing confirmed users
-- 3. Optionally disabling email confirmation requirement

-- ============================================
-- OPTION 1: ADD TRIGGER TO SYNC EMAIL VERIFICATION
-- ============================================

-- Function to handle email confirmation updates
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- When email is confirmed, update the profile
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at != NEW.email_confirmed_at) THEN
    UPDATE public.profiles
    SET 
      email_verified = true,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email confirmation
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_email_confirmation();

-- ============================================
-- SYNC EXISTING CONFIRMED USERS
-- ============================================

-- Update profiles for users who have already confirmed their email
UPDATE public.profiles
SET 
  email_verified = true,
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email_confirmed_at IS NOT NULL
)
AND email_verified = false;

-- ============================================
-- OPTION 2: AUTO-CONFIRM ALL EXISTING USERS (DEVELOPMENT/QUICK FIX)
-- ============================================
-- ⚠️ WARNING: Only use this in development or if you want to 
-- bypass email verification for existing users

-- Uncomment the following lines to auto-confirm all existing users:

-- UPDATE auth.users 
-- SET email_confirmed_at = NOW() 
-- WHERE email_confirmed_at IS NULL;

-- UPDATE public.profiles
-- SET email_verified = true
-- WHERE email_verified = false;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check users with unconfirmed emails
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  p.email_verified
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email_confirmed_at IS NULL
ORDER BY u.created_at DESC;

-- Check sync status between auth.users and profiles
SELECT 
  COUNT(*) FILTER (WHERE u.email_confirmed_at IS NOT NULL AND p.email_verified = false) as out_of_sync_count,
  COUNT(*) FILTER (WHERE u.email_confirmed_at IS NOT NULL) as confirmed_in_auth,
  COUNT(*) FILTER (WHERE p.email_verified = true) as verified_in_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;
