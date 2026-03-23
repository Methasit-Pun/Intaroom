-- ============================================
-- FIX RESERVATIONS-PROFILES RELATIONSHIP
-- ============================================
-- This migration fixes the relationship between reservations and profiles tables
-- to allow proper Supabase joins in the admin dashboard

-- Add explicit foreign key relationship between reservations and profiles
-- Since both reference auth.users(id), we need to ensure the relationship is clear

-- First, let's check if the relationship exists
DO $$ 
BEGIN
  -- Drop the old foreign key if it exists and recreate it properly
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reservations_user_id_fkey' 
    AND table_name = 'reservations'
  ) THEN
    ALTER TABLE reservations DROP CONSTRAINT reservations_user_id_fkey;
  END IF;
  
  -- Add the foreign key constraint that references auth.users
  ALTER TABLE reservations 
  ADD CONSTRAINT reservations_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  
  -- Ensure profiles table has proper constraint too
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

END $$;

-- Create a view that makes the relationship explicit for Supabase
CREATE OR REPLACE VIEW reservations_with_user_details AS
SELECT 
  r.*,
  p.full_name as user_name,
  p.email as user_email,
  p.telephone as user_telephone,
  rm.name as room_name,
  rm.capacity as room_capacity
FROM reservations r
LEFT JOIN profiles p ON r.user_id = p.id
LEFT JOIN rooms rm ON r.room_id = rm.id;

-- Grant access to the view
GRANT SELECT ON reservations_with_user_details TO authenticated;
GRANT SELECT ON reservations_with_user_details TO anon;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';