-- Complete fix for registration flow and profile creation
-- This script ensures proper profile creation with all data from registration

-- First, ensure the profiles table has all required columns matching the schema
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS telephone TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create or update the handle_new_user function to capture ALL registration data
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
    telephone,
    phone,
    line_user_id,
    avatar_url,
    credits,
    created_at,
    updated_at
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
    new.raw_user_meta_data->>'telephone', -- For form submissions
    new.raw_user_meta_data->>'phone',     -- Backup field
    new.raw_user_meta_data->>'line_user_id',
    new.raw_user_meta_data->>'avatar_url',
    100, -- Default credits
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE 
      WHEN EXCLUDED.full_name != '' AND EXCLUDED.full_name IS NOT NULL THEN EXCLUDED.full_name 
      ELSE profiles.full_name 
    END,
    username = CASE 
      WHEN EXCLUDED.username != '' AND EXCLUDED.username IS NOT NULL THEN EXCLUDED.username 
      ELSE profiles.username 
    END,
    telephone = CASE 
      WHEN EXCLUDED.telephone IS NOT NULL THEN EXCLUDED.telephone 
      ELSE profiles.telephone 
    END,
    phone = CASE 
      WHEN EXCLUDED.phone IS NOT NULL THEN EXCLUDED.phone 
      ELSE profiles.phone 
    END,
    line_user_id = EXCLUDED.line_user_id,
    avatar_url = EXCLUDED.avatar_url,
    email_verified = CASE 
      WHEN EXCLUDED.line_user_id IS NOT NULL THEN true 
      WHEN NEW.email_confirmed_at IS NOT NULL THEN true
      ELSE profiles.email_verified 
    END,
    updated_at = NOW();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle email confirmation updates
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile when email is confirmed
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles 
    SET 
      email_verified = true,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the triggers exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_confirmation();

-- Add proper RLS policies (fixed to avoid infinite recursion)
-- Enable RLS first
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies safely
DO $$
BEGIN
  -- Drop policies if they exist
  BEGIN
    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END
$$;

-- Create new policies
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

-- Add updated_at trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
