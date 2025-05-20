-- Add telephone and credits fields to profiles table if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS telephone TEXT,
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;
