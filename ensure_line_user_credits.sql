-- Function to ensure LINE users have credits
CREATE OR REPLACE FUNCTION ensure_line_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- If credits is null or 0, set to default 100
  IF NEW.credits IS NULL OR NEW.credits = 0 THEN
    NEW.credits := 100;
  END IF;
  
  -- If this is a LINE user (has line_user_id), ensure they have credits
  IF NEW.line_user_id IS NOT NULL AND (NEW.credits IS NULL OR NEW.credits = 0) THEN
    NEW.credits := 100;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert or update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_line_user_credits_trigger'
  ) THEN
    CREATE TRIGGER ensure_line_user_credits_trigger
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_line_user_credits();
  END IF;
END
$$;
