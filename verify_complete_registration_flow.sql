-- Verification script to test the complete registration flow
-- Run this after applying the fix_complete_registration_flow.sql

-- 1. Check if all required columns exist in profiles table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if the handle_new_user function exists and is properly defined
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
  AND routine_schema = 'public';

-- 3. Check if the handle_email_confirmation function exists
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_email_confirmation' 
  AND routine_schema = 'public';

-- 4. Check if triggers are properly set up
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  OR (trigger_schema = 'auth' AND trigger_name IN ('on_auth_user_created', 'on_auth_user_email_confirmed'));

-- 5. Check RLS policies on profiles table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. Test data - Check if any profiles exist and their structure
SELECT 
  id,
  username,
  full_name,
  email,
  role,
  email_verified,
  telephone,
  phone,
  credits,
  line_user_id,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. Check for any auth users without corresponding profiles
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at,
  p.id as profile_id
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 8. Show successful registrations (users with profiles)
SELECT 
  au.email,
  au.email_confirmed_at,
  au.created_at as auth_created,
  p.username,
  p.full_name,
  p.email_verified,
  p.created_at as profile_created
FROM auth.users au
JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 10;
