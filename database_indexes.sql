-- Add indexes to frequently queried columns
CREATE INDEX IF NOT EXISTS idx_reservations_room_id_date ON reservations(room_id, date);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_number ON reservations(confirmation_number);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
