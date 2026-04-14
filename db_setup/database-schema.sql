-- ============================================
-- DATABASE SCHEMA AND CORE STRUCTURE
-- ============================================
-- This file contains the core database schema including tables, 
-- core functions, and initial structure setup

-- ============================================
-- PROFILES TABLE
-- ============================================

-- Create profiles table to store user information and roles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  email_verified BOOLEAN DEFAULT false,
  username TEXT UNIQUE,
  telephone TEXT,
  line_user_id TEXT UNIQUE,
  avatar_url TEXT,
  credits INTEGER DEFAULT 100,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  ban_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROOMS TABLE AND RELATED STRUCTURES
-- ============================================

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create room_features table
CREATE TABLE IF NOT EXISTS room_features (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for room features
CREATE TABLE IF NOT EXISTS room_features_junction (
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  feature_id INTEGER REFERENCES room_features(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, feature_id)
);

-- ============================================
-- RESERVATIONS TABLE
-- ============================================

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  booking_name TEXT NOT NULL,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  purpose TEXT,
  attendees INTEGER,
  contact_email TEXT,
  contact_phone TEXT,
  special_requests TEXT,
  equipment_needed TEXT,
  qr_code_url TEXT,
  admin_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ADMIN TABLE (Direct Admin Auth)
-- ============================================

-- Create admin table for direct admin authentication
CREATE TABLE IF NOT EXISTS public.admin (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CORE FUNCTIONS
-- ============================================

-- Function to handle new user registration
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
    line_user_id,
    avatar_url,
    credits
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
    COALESCE(new.raw_user_meta_data->>'telephone', new.raw_user_meta_data->>'phone'),
    new.raw_user_meta_data->>'line_user_id',
    new.raw_user_meta_data->>'avatar_url',
    100 -- Default credits
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE
      WHEN EXCLUDED.full_name != '' AND EXCLUDED.full_name IS NOT NULL THEN EXCLUDED.full_name
      ELSE profiles.full_name
    END,
    line_user_id = COALESCE(EXCLUDED.line_user_id, profiles.line_user_id),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role without triggering RLS policies
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TABLE (role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.role
  FROM profiles p
  WHERE p.id = user_id;
END;
$$;

-- Function to check if a username already exists
CREATE OR REPLACE FUNCTION check_username_exists(username_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE username = username_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle potential LINE user duplicates
CREATE OR REPLACE FUNCTION handle_line_user_auth(
  p_line_user_id TEXT,
  p_display_name TEXT,
  p_picture_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  credits INTEGER,
  is_new_user BOOLEAN
) AS $$
DECLARE
  existing_user_record RECORD;
  new_user_id UUID;
  unique_email TEXT;
  timestamp_suffix TEXT;
BEGIN
  -- Check if user already exists
  SELECT * INTO existing_user_record
  FROM profiles
  WHERE line_user_id = p_line_user_id
  LIMIT 1;
  
  IF existing_user_record IS NOT NULL THEN
    -- User exists, return existing data
    RETURN QUERY SELECT
      existing_user_record.id,
      existing_user_record.email,
      COALESCE(existing_user_record.credits, 100),
      FALSE;
  ELSE
    -- User doesn't exist, create new one
    timestamp_suffix := EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6);
    unique_email := 'line_' || p_line_user_id || '_' || timestamp_suffix || '@lineuser.local';
    new_user_id := gen_random_uuid();
    
    -- Insert into auth.users first
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      unique_email,
      crypt('line_' || p_line_user_id, gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'line_user_id', p_line_user_id,
        'display_name', p_display_name,
        'avatar_url', p_picture_url
      ),
      NOW(),
      NOW()
    );
    
    -- Return new user data
    RETURN QUERY SELECT
      new_user_id,
      unique_email,
      100,
      TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure LINE users have credits
CREATE OR REPLACE FUNCTION ensure_line_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for LINE users
  IF NEW.line_user_id IS NOT NULL AND (NEW.credits IS NULL OR NEW.credits = 0) THEN
    NEW.credits := 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Create trigger for new user handling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Create trigger for LINE user credits
DROP TRIGGER IF EXISTS ensure_line_user_credits_trigger ON profiles;
CREATE TRIGGER ensure_line_user_credits_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_line_user_credits();

-- ============================================
-- INITIAL DATA SETUP
-- ============================================

-- Insert basic room features
INSERT INTO room_features (name) VALUES 
  ('Projector'),
  ('Whiteboard'),
  ('Air Conditioning'),
  ('WiFi'),
  ('Sound System')
ON CONFLICT DO NOTHING;

-- Insert sample rooms
INSERT INTO rooms (name, capacity, description, is_active) VALUES 
  ('Conference Room A', 10, 'Large conference room with projector', true),
  ('Meeting Room B', 6, 'Small meeting room for team discussions', true),
  ('Study Room C', 4, 'Quiet study room for focused work', true)
ON CONFLICT DO NOTHING;