-- First, create the admin user in auth.users table
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Check if the admin user already exists with the new username
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
  
  -- Now create or update the profile with admin role
  -- First check if profile exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = admin_id) THEN
    -- Update existing profile
    UPDATE public.profiles
    SET 
      full_name = 'Admin User',
      role = 'admin',
      email_verified = true,
      updated_at = now()
    WHERE id = admin_id;
  ELSE
    -- Create new profile
    INSERT INTO public.profiles (
      id, 
      full_name, 
      email, 
      role, 
      email_verified,
      created_at,
      updated_at
    )
    VALUES (
      admin_id,
      'Admin User',
      'Admin_1',
      'admin',
      true,
      now(),
      now()
    );
  END IF;
  
  RAISE NOTICE 'Admin user created or updated with ID: %', admin_id;
END
$$;
