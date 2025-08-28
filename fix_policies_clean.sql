-- Simple immediate fix for RLS policy conflicts
-- Run this to clean up and recreate policies properly

-- First, disable RLS temporarily to clear all policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;


-- Drop all existing policies without error checking
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
    END LOOP;
END
$$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, clean policies
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE 
  USING (auth.uid() = id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Verify the policies
SELECT policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename = 'profiles';
