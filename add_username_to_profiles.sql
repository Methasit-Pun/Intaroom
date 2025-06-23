-- Add username column to profiles table
ALTER TABLE profiles ADD COLUMN username TEXT;

-- Update existing profiles with a default username based on their email
UPDATE profiles 
SET username = SUBSTRING(email FROM 1 FOR POSITION('@' IN email) - 1)
WHERE username IS NULL AND email IS NOT NULL;

-- Add a unique constraint to username
ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
