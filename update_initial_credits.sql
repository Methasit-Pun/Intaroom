-- Update initial credits for all users to 3
-- Run this script to set the default credits to 3 for all users

-- First, ensure the profiles table has the credits column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 3;

-- Update credits for all existing users to 3
UPDATE profiles
SET credits = 3
WHERE credits IS NULL OR credits != 3;

-- Update the default value for the credits column to 3
ALTER TABLE profiles 
ALTER COLUMN credits SET DEFAULT 3;

-- Ensure the handle_new_user function sets initial credits to 3
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
    credits = 3;  -- Always update credits to 3
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Output a message to confirm the script has run
DO $$
BEGIN
  RAISE NOTICE 'Initial credits set to 3 for all users!';
END
$$;
