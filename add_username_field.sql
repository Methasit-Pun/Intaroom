-- Add username column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Update the handle_new_user function to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, email_verified, username)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    new.email, 
    'user', 
    false,
    COALESCE(new.raw_user_meta_data->>'username', '')
  );
  RETURN new;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a username is available
CREATE OR REPLACE FUNCTION public.is_username_available(username_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles WHERE username = username_to_check
  );
END
$;

-- Create a function to get email by username
CREATE OR REPLACE FUNCTION public.get_email_by_username(username_to_find TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $
BEGIN
  RETURN (
    SELECT email FROM profiles WHERE username = username_to_find
  );
END
$;
