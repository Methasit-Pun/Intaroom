-- Fix existing users with null usernames
-- Run this after recreating the profiles table

UPDATE public.profiles 
SET username = 'user_' || SUBSTRING(id::text, 1, 8)
WHERE username IS NULL;

-- Also update the handle_new_user function to properly read username from signup data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, email_verified, credits, username)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email, 
    'user', 
    false, 
    10,
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || SUBSTRING(new.id::text, 1, 8))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
