-- Check current RLS status and policies
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'reservations', 'rooms');

-- Temporarily disable RLS on profiles table for debugging
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Check if there are any blocking policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Create a more permissive policy for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies that allow proper access
CREATE POLICY "Enable read access for authenticated users" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on user_id" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Check auth.users table access (this should work by default)
-- Make sure the test user exists and is properly configured
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'mb@test.com';

-- If the user doesn't exist, create it
DO $$
DECLARE
    user_id UUID;
BEGIN
    -- Check if user exists
    SELECT id INTO user_id FROM auth.users WHERE email = 'mb@test.com';
    
    IF user_id IS NULL THEN
        -- Create the user
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_sent_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'mb@test.com',
            crypt('abc123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Test User MB"}',
            FALSE,
            NOW(),
            NOW()
        ) RETURNING id INTO user_id;
        
        -- Create corresponding profile
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
        
        RAISE NOTICE 'Created test user with ID: %', user_id;
    ELSE
        RAISE NOTICE 'Test user already exists with ID: %', user_id;
    END IF;
END $$;
