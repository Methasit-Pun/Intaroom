-- Ensure username from registration is properly stored in profiles
-- Also checks for duplicate usernames and provides proper error messages

-- First, update the username check function to be more robust
CREATE OR REPLACE FUNCTION check_username_exists(username_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return true if username exists, false otherwise
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE lower(username) = lower(username_to_check)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION check_username_exists(TEXT) TO authenticated, anon;

-- Create a function that can be called before registration to validate username
CREATE OR REPLACE FUNCTION validate_username(username_to_validate TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if username is too short
  IF length(username_to_validate) < 3 THEN
    result := jsonb_build_object(
      'valid', false,
      'message', 'Username must be at least 3 characters long'
    );
    RETURN result;
  END IF;
  
  -- Check if username is already taken
  IF EXISTS (SELECT 1 FROM profiles WHERE lower(username) = lower(username_to_validate)) THEN
    result := jsonb_build_object(
      'valid', false,
      'message', 'This username is already taken'
    );
    RETURN result;
  END IF;
  
  -- Username is valid
  result := jsonb_build_object(
    'valid', true,
    'message', 'Username is available'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_username(TEXT) TO authenticated, anon;

-- Update the handle_new_user function to properly store username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Get username from user metadata, or generate one
  DECLARE
    username_value TEXT;
    base_username TEXT;
    counter INT := 1;
  BEGIN
    -- Try to get username from metadata first
    username_value := new.raw_user_meta_data->>'username';
    
    -- If no username in metadata, generate one
    IF username_value IS NULL OR username_value = '' THEN
      -- Use email prefix as base username
      base_username := split_part(new.email, '@', 1);
      username_value := base_username;
      
      -- If generated username exists, append numbers until unique
      WHILE EXISTS (SELECT 1 FROM profiles WHERE username = username_value) LOOP
        username_value := base_username || counter;
        counter := counter + 1;
      END LOOP;
    END IF;
    
    -- Insert the new profile with proper data
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
      true, -- Always set email_verified to true to skip verification
      username_value, -- Use the determined username value
      new.raw_user_meta_data->>'line_user_id',
      new.raw_user_meta_data->>'avatar_url',
      3  -- Set initial credits to 3
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = CASE 
        WHEN EXCLUDED.full_name != '' THEN EXCLUDED.full_name 
        ELSE profiles.full_name 
      END,
      username = CASE
        WHEN profiles.username IS NULL OR profiles.username = '' THEN EXCLUDED.username
        ELSE profiles.username
      END,
      line_user_id = EXCLUDED.line_user_id,
      avatar_url = EXCLUDED.avatar_url,
      email_verified = true,
      credits = 3;
    
    RETURN new;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
