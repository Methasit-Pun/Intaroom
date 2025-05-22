-- Add LINE user ID column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update the handle_new_user function to include LINE user ID
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
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    new.email, 
    'user', 
    false, 
    COALESCE(new.raw_user_meta_data->>'username', new.email),
    new.raw_user_meta_data->>'line_user_id',
    new.raw_user_meta_data->>'avatar_url',
    100
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
