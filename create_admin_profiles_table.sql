-- Create admin_profiles table for direct admin authentication
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the admin user
INSERT INTO public.admin_profiles (email, password, full_name)
VALUES ('admin1', 'admin123', 'Admin User')
ON CONFLICT (email) 
DO UPDATE SET 
  password = 'admin123',
  full_name = 'Admin User',
  updated_at = NOW();

-- Enable RLS on admin_profiles table
ALTER TABLE IF EXISTS public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read admin_profiles
-- This is needed for the login check
CREATE POLICY "Allow anyone to read admin_profiles" ON public.admin_profiles
  FOR SELECT USING (true);
