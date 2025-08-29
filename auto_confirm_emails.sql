-- Auto-confirm emails for all existing users
-- This script will set email_confirmed_at for all users to the current timestamp
-- which will effectively verify all users without requiring email verification

-- Only run this in development/testing environments, not in production!

-- Update auth.users to set email_confirmed_at for all users
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Also create a trigger to automatically confirm emails for new users
-- This bypasses email verification for all new registrations

CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Set email_confirmed_at to current timestamp for all new users
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id AND email_confirmed_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'auto_confirm_email_trigger'
  ) THEN
    CREATE TRIGGER auto_confirm_email_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_email();
  END IF;
END
$$;

-- Output a message to confirm the script has run
DO $$
BEGIN
  RAISE NOTICE 'Email confirmation bypass has been set up successfully!';
END
$$;
