-- Fix RLS policies for profiles table to resolve infinite recursion error
-- Run this script immediately to fix the current issue

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create simple, non-recursive policies
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT 
  USING (
    auth.uid() = id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE 
  USING (
    auth.uid() = id OR 
    auth.jwt() ->> 'role' = 'service_role'
  )
  WITH CHECK (
    auth.uid() = id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE 
  USING (
    auth.uid() = id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Verify policies are working
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';
