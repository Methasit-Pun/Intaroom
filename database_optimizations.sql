-- Add indexes to frequently queried columns
CREATE INDEX IF NOT EXISTS idx_reservations_room_id_date ON reservations(room_id, date);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_number ON reservations(confirmation_number);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Analyze tables to update statistics for the query planner
ANALYZE profiles;
ANALYZE reservations;
ANALYZE rooms;

-- Add partial index for pending reservations (commonly queried)
CREATE INDEX IF NOT EXISTS idx_reservations_pending ON reservations(status) WHERE status = 'Pending';

-- Add index for upcoming reservations
CREATE INDEX IF NOT EXISTS idx_reservations_upcoming ON reservations(date) WHERE date >= CURRENT_DATE;
