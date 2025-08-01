-- Add qr_code_url column to reservations table
-- This column will store the generated QR code text for each reservation

ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Add an index to improve query performance when searching by QR code
CREATE INDEX IF NOT EXISTS idx_reservations_qr_code_url ON reservations(qr_code_url);

-- Comment for documentation
COMMENT ON COLUMN reservations.qr_code_url IS 'Generated QR code text for reservation access control';
