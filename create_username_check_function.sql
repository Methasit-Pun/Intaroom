-- Create a function to check if a username already exists
CREATE OR REPLACE FUNCTION check_username_exists(username_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE username = username_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_username_exists(TEXT) TO authenticated, anon;
