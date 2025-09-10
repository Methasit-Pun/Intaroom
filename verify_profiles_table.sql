-- Verification script to check profiles table
-- Run this to verify the table structure and data integrity

-- 1. Check current table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check for users with null usernames (should be 0 after fix)
SELECT COUNT(*) as null_username_count
FROM public.profiles 
WHERE username IS NULL;

-- 3. Check for users with null full_name (these are fine)
SELECT COUNT(*) as null_fullname_count
FROM public.profiles 
WHERE full_name IS NULL OR full_name = '';

-- 4. Test profile access for a sample user
SELECT 
  id,
  full_name,
  username,
  email,
  credits,
  CASE 
    WHEN full_name IS NOT NULL AND full_name != '' THEN full_name
    WHEN username IS NOT NULL AND username != '' THEN username
    ELSE 'User'
  END as display_name,
  CASE 
    WHEN full_name IS NOT NULL AND full_name != '' THEN UPPER(SUBSTRING(full_name, 1, 1))
    WHEN username IS NOT NULL AND username != '' THEN UPPER(SUBSTRING(username, 1, 1))
    ELSE 'U'
  END as avatar_letter
FROM public.profiles 
LIMIT 3;

-- 5. Check if required functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'handle_new_user',
    'handle_email_confirmation', 
    'get_user_role',
    'is_username_available',
    'handle_line_user'
  );

-- 6. Check RLS policies
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'profiles';
