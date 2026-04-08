-- ============================================
-- AUTHENTICATION AND USER MANAGEMENT
-- ============================================
-- This file contains all authentication-related configurations,
-- user management functions, and admin setup

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on profiles table
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON profiles;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Enable RLS on reservations table
ALTER TABLE IF EXISTS public.reservations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reservations
DROP POLICY IF EXISTS "Users can view their own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can create reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can view all reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can update reservations" ON reservations;

CREATE POLICY "reservations_select_policy" ON reservations
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "reservations_insert_policy" ON reservations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "reservations_update_policy" ON reservations
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Enable RLS on admin_profiles table
ALTER TABLE IF EXISTS public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read admin_profiles (needed for login check)
CREATE POLICY "Allow anyone to read admin_profiles" ON public.admin_profiles
  FOR SELECT USING (true);

-- Enable RLS on rooms table
ALTER TABLE IF EXISTS public.rooms ENABLE ROW LEVEL SECURITY;

-- Create policies for rooms (public read access)
CREATE POLICY "rooms_select_policy" ON rooms
  FOR SELECT USING (true);

CREATE POLICY "rooms_admin_full_access" ON rooms
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- ADMIN USER SETUP
-- ============================================

-- Insert the default admin user into admin_profiles
-- password_hash is SHA-256 of the plaintext password.
-- To generate a hash for a new password run:
--   node -e "const {createHash}=require('crypto'); console.log(createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"
INSERT INTO public.admin_profiles (id, email, username, password_hash, full_name)
VALUES (gen_random_uuid(), 'admin1@admin.local', 'admin1', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Admin User')
ON CONFLICT (username)
DO UPDATE SET
  password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  full_name = 'Admin User',
  updated_at = NOW();

-- Create admin user in auth.users table
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Check if the admin user already exists
  SELECT id INTO admin_id FROM auth.users WHERE email = 'Admin_1';
  
  -- If admin doesn't exist, create it
  IF admin_id IS NULL THEN
    INSERT INTO auth.users (
      email,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at
    ) VALUES (
      'Admin_1',
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin"}',
      FALSE,
      crypt('adminpassword123', gen_salt('bf')),
      now(),
      now(),
      now()
    )
    RETURNING id INTO admin_id;
  END IF;
  
  -- Create or update the profile with admin role
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    email_verified,
    username,
    credits
  ) VALUES (
    admin_id,
    'Admin User',
    'Admin_1',
    'admin',
    true,
    'admin1',
    999999
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = 'Admin User',
    role = 'admin',
    email_verified = true,
    username = 'admin1',
    credits = 999999,
    updated_at = now();
END $$;

-- ============================================
-- TEST USER SETUP (for development)
-- ============================================

-- Create test user MB with password abc123
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Clean up existing test user
  DELETE FROM auth.users WHERE email = 'mb@test.com';
  
  -- Create test user
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    'mb@test.com',
    crypt('abc123', gen_salt('bf')),
    NOW(),
    '{"full_name": "Test User MB"}',
    NOW(),
    NOW()
  )
  RETURNING id INTO test_user_id;
  
  -- Create profile for test user
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    email_verified,
    username,
    credits
  ) VALUES (
    test_user_id,
    'Test User MB',
    'mb@test.com',
    'user',
    true,
    'mb_test',
    100
  );
END $$;

-- ============================================
-- EMAIL CONFIRMATION SETTINGS
-- ============================================

-- Auto-confirm emails for development (disable in production)
-- This is useful for testing without email verification
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL 
AND email LIKE '%@test.com';

-- Update email_verified status in profiles for auto-confirmed users
UPDATE profiles 
SET email_verified = true 
WHERE email_verified = false 
AND email IN (
  SELECT email FROM auth.users 
  WHERE email_confirmed_at IS NOT NULL
);

-- ============================================
-- USER MANAGEMENT FUNCTIONS
-- ============================================

-- Function to ban/unban users
CREATE OR REPLACE FUNCTION ban_user(
  target_user_id UUID,
  ban_reason_text TEXT DEFAULT NULL,
  ban_duration_hours INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  ban_until_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate ban until time if duration is provided
  IF ban_duration_hours IS NOT NULL THEN
    ban_until_time := NOW() + INTERVAL '1 hour' * ban_duration_hours;
  END IF;
  
  -- Update user ban status
  UPDATE profiles 
  SET 
    is_banned = true,
    ban_reason = ban_reason_text,
    ban_until = ban_until_time,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unban users
CREATE OR REPLACE FUNCTION unban_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles 
  SET 
    is_banned = false,
    ban_reason = NULL,
    ban_until = NULL,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is currently banned
CREATE OR REPLACE FUNCTION is_user_banned(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_ban_status RECORD;
BEGIN
  SELECT is_banned, ban_until INTO user_ban_status
  FROM profiles 
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- If user is not marked as banned, return false
  IF NOT user_ban_status.is_banned THEN
    RETURN false;
  END IF;
  
  -- If ban has expiration and it's passed, auto-unban
  IF user_ban_status.ban_until IS NOT NULL AND user_ban_status.ban_until <= NOW() THEN
    PERFORM unban_user(user_id);
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREDIT MANAGEMENT
-- ============================================

-- Function to add credits to user
CREATE OR REPLACE FUNCTION add_user_credits(
  target_user_id UUID,
  credit_amount INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  new_credit_total INTEGER;
BEGIN
  UPDATE profiles 
  SET 
    credits = credits + credit_amount,
    updated_at = NOW()
  WHERE id = target_user_id
  RETURNING credits INTO new_credit_total;
  
  RETURN new_credit_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct credits from user
CREATE OR REPLACE FUNCTION deduct_user_credits(
  target_user_id UUID,
  credit_amount INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  current_credits INTEGER;
  new_credit_total INTEGER;
BEGIN
  -- Check current credits
  SELECT credits INTO current_credits 
  FROM profiles 
  WHERE id = target_user_id;
  
  IF current_credits IS NULL OR current_credits < credit_amount THEN
    RAISE EXCEPTION 'Insufficient credits. User has % credits, but % are required.', 
      COALESCE(current_credits, 0), credit_amount;
  END IF;
  
  -- Deduct credits
  UPDATE profiles 
  SET 
    credits = credits - credit_amount,
    updated_at = NOW()
  WHERE id = target_user_id
  RETURNING credits INTO new_credit_total;
  
  RETURN new_credit_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;