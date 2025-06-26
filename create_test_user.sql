-- Create test user MB with password abc123
-- First, let's check if the user already exists and clean up if needed
DELETE FROM auth.users WHERE email = 'mb@test.com';
DELETE FROM profiles WHERE username = 'MB';

-- Insert the user into auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'mb@test.com',
  crypt('abc123', gen_salt('bf')), -- This encrypts the password 'abc123'
  NOW(), -- Email confirmed
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL
);

-- Get the user ID we just created
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'mb@test.com';
  
  -- Insert into profiles table
  INSERT INTO profiles (
    id,
    username,
    full_name,
    email,
    credits,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    'MB',
    'Test User MB',
    'mb@test.com',
    100,
    NOW(),
    NOW()
  );
END $$;
