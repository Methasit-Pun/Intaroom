-- Add username column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Update the handle_new_user function to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, email_verified, username)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    new.email, 
    'user', 
    false, 
    COALESCE(new.raw_user_meta_data->>'username', new.email)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
