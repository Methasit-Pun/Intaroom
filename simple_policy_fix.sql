-- Simple fix for infinite recursion in profiles RLS policies
-- This script uses the most basic approach to avoid any further issues

-- First, drop all existing policies on the profiles table
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create the absolute simplest policies possible to avoid recursion

-- Policy for SELECT: Anyone can read any profile (public data)
CREATE POLICY "allow_select_all" ON profiles
  FOR SELECT 
  USING (true);

-- Policy for INSERT: Anyone can insert their own profile
CREATE POLICY "allow_insert_own" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Policy for UPDATE: Anyone can update their own profile
CREATE POLICY "allow_update_own" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id);

-- Policy for DELETE: No one can delete profiles (for safety)
CREATE POLICY "no_delete" ON profiles
  FOR DELETE 
  USING (false);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

-- Make sure the handle_new_user function is as simple as possible
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    role, 
    email_verified,
    credits
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email, 
    'user', 
    true,  -- Always verify email
    3      -- Set initial credits to 3
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
