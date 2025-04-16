-- Create a database function to get user role without triggering RLS policies
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TABLE (role TEXT) 
SECURITY DEFINER -- This makes the function run with the privileges of the creator
AS $$
BEGIN
  RETURN QUERY 
  SELECT p.role FROM profiles p WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO anon, authenticated;
