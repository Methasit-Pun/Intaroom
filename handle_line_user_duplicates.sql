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
    
    -- Insert new profile
    INSERT INTO profiles (
      id,
      email,
      full_name,
      line_user_id,
      avatar_url,
      credits,
      role,
      email_verified,
      username
    ) VALUES (
      new_user_id,
      unique_email,
      p_display_name,
      p_line_user_id,
      p_picture_url,
      100,
      'user',
      true, -- LINE users are considered verified
      'line_' || p_line_user_id
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION handle_line_user_auth(TEXT, TEXT, TEXT) TO anon, authenticated;
