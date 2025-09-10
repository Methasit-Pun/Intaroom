-- Fix registration profile creation issues
-- Run this script to ensure proper profile creation during registration

-- First, ensure the profiles table has all required columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Update the handle_new_user function to properly handle all signup data
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
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', ''), 
    new.email, 
    'user', 
    true, -- Always set email_verified to true to skip verification
    COALESCE(
      new.raw_user_meta_data->>'username', 
      CASE 
        WHEN new.raw_user_meta_data->>'line_user_id' IS NOT NULL 
        THEN 'line_' || new.raw_user_meta_data->>'line_user_id'
        ELSE 'user_' || SUBSTRING(new.id::text, 1, 8)
      END
    ),
    new.raw_user_meta_data->>'line_user_id',
    new.raw_user_meta_data->>'avatar_url',
    3
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
    email_verified = CASE 
      WHEN EXCLUDED.line_user_id IS NOT NULL THEN true 
      ELSE profiles.email_verified 
    END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policy for profile creation during registration
DO $$
BEGIN
  -- Allow users to insert their own profile during registration
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END
$$;