-- Fix infinite recursion in profiles RLS policies and ensure registration data capture
-- Run this script to resolve the infinite recursion error and ensure profile data is properly captured

-- First, let's fix the infinite recursion issue by dropping all existing policies
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

-- Create new, simplified policies that avoid circular references
-- Policy for SELECT: Users can read their own profile or admins can read all
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT 
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy for INSERT: Users can only insert their own profile
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id
  );

-- Policy for UPDATE: Users can update their own profile or admins can update any
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE 
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy for DELETE: Only admins can delete profiles
CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Now, update the handle_new_user function to properly capture full_name and username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    role, 
    email_verified, 
    username,
    line_user_id,
    avatar_url,
    credits
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), -- Get full_name from registration
    new.email, 
    'user', 
    true, -- Always set email_verified to true
    COALESCE(
      new.raw_user_meta_data->>'username', -- Get username from registration
      CASE 
        WHEN new.raw_user_meta_data->>'line_user_id' IS NOT NULL 
        THEN 'line_' || new.raw_user_meta_data->>'line_user_id'
        ELSE 'user_' || SUBSTRING(new.id::text, 1, 8)
      END
    ),
    new.raw_user_meta_data->>'line_user_id',
    new.raw_user_meta_data->>'avatar_url',
    3  -- Set initial credits to 3
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE 
      WHEN EXCLUDED.full_name != '' THEN EXCLUDED.full_name 
      ELSE profiles.full_name 
    END,
    username = CASE 
      WHEN EXCLUDED.username != '' AND EXCLUDED.username IS NOT NULL THEN EXCLUDED.username 
      ELSE profiles.username 
    END,
    line_user_id = EXCLUDED.line_user_id,
    avatar_url = EXCLUDED.avatar_url,
    email_verified = true,
    credits = 3;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

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
