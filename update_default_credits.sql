-- Update the default credits value for new users
ALTER TABLE profiles 
ALTER COLUMN credits SET DEFAULT 100;

-- Update existing users to have 100 credits if they have less
UPDATE profiles
SET credits = 100
WHERE credits < 100 OR credits IS NULL;
