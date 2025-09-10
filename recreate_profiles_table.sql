-- Complete SQL script to recreate the profiles table
-- Run this in your Supabase SQL editor






-- 1. Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  email_verified BOOLEAN DEFAULT false,
  phone TEXT,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  ban_until TIMESTAMP WITH TIME ZONE,
  line_user_id TEXT UNIQUE,
  username TEXT UNIQUE,
  credits INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON public.profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 3. Create the handle_new_user function
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

-- 4. Create the trigger for new user creation
-- Skip this part
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Create the handle_email_confirmation function
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email_verified = true
  WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create the email confirmation trigger
-- Skip this part
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_email_confirmation();

-- 7. Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to check username availability
CREATE OR REPLACE FUNCTION public.is_username_available(username_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = username_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to handle LINE user registration/login
CREATE OR REPLACE FUNCTION public.handle_line_user(
  p_line_user_id TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  user_uuid UUID;
  existing_profile RECORD;
BEGIN
  -- Check if LINE user already exists
  SELECT * INTO existing_profile
  FROM public.profiles
  WHERE line_user_id = p_line_user_id;

  IF existing_profile.id IS NOT NULL THEN
    -- User exists, return their ID
    RETURN existing_profile.id;
  ELSE
    -- Create new user
    user_uuid := gen_random_uuid();
    
    INSERT INTO public.profiles (
      id,
      full_name,
      email,
      role,
      email_verified,
      line_user_id,
      credits
    ) VALUES (
      user_uuid,
      COALESCE(p_display_name, 'LINE User'),
      COALESCE(p_email, user_uuid::text || '@line.temp'),
      'user',
      false,
      p_line_user_id,
      10
    );
    
    RETURN user_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 11. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- 12. Create RLS policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 13. Insert admin user if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = 'mb@test.com'
  ) THEN
    INSERT INTO public.profiles (
      id,
      full_name,
      email,
      role,
      email_verified,
      credits
    ) VALUES (
      gen_random_uuid(),
      'MB Admin',
      'mb@test.com',
      'admin',
      true,
      1000
    );
  END IF;
END $$;

-- 14. Add comments for documentation
COMMENT ON TABLE public.profiles IS 'User profiles table with role-based access control';
COMMENT ON COLUMN public.profiles.role IS 'User role: user or admin';
COMMENT ON COLUMN public.profiles.credits IS 'User credits for room reservations';
COMMENT ON COLUMN public.profiles.line_user_id IS 'LINE messenger user ID for integration';
COMMENT ON COLUMN public.profiles.is_banned IS 'Whether the user is banned from the system';

-- Verification query (run this to check if everything was created)
SELECT 
  'profiles' as table_name,
  COUNT(*) as record_count
FROM public.profiles
UNION ALL
SELECT 
  'triggers' as table_name,
  COUNT(*) as count
FROM pg_trigger 
WHERE tgname IN ('on_auth_user_created', 'on_auth_user_email_confirmed')
UNION ALL
SELECT 
  'policies' as table_name,
  COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'profiles';
