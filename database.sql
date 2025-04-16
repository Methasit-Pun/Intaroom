-- Create profiles table to store user information and roles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rooms table
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create room_features table
CREATE TABLE room_features (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for room features
CREATE TABLE room_features_junction (
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  feature_id INTEGER REFERENCES room_features(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, feature_id)
);

-- Create reservations table
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  booking_name TEXT NOT NULL,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  purpose TEXT,
  attendees INTEGER,
  contact_email TEXT,
  contact_phone TEXT,
  confirmation_number TEXT UNIQUE,
  special_requests TEXT[],
  check_in_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure no overlapping reservations for the same room
  CONSTRAINT no_overlapping_reservations UNIQUE (room_id, date, start_time, end_time)
);

-- Create RLS policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Anyone can read active rooms
CREATE POLICY "Anyone can read active rooms" ON rooms
  FOR SELECT USING (is_active = TRUE);

-- Only admins can create, update, or delete rooms
CREATE POLICY "Admins can manage rooms" ON rooms
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Users can read their own reservations
CREATE POLICY "Users can read own reservations" ON reservations
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create reservations
CREATE POLICY "Users can create reservations" ON reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending reservations
CREATE POLICY "Users can update own pending reservations" ON reservations
  FOR UPDATE USING (
    auth.uid() = user_id AND status = 'Pending'
  );

-- Admins can read all reservations
CREATE POLICY "Admins can read all reservations" ON reservations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any reservation
CREATE POLICY "Admins can update any reservation" ON reservations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert sample room features
INSERT INTO room_features (name) VALUES
  ('Projector'),
  ('TV'),
  ('Whiteboard'),
  ('Conference Phone'),
  ('Video Conferencing'),
  ('Air Conditioning'),
  ('Natural Light'),
  ('Catering Available');

-- Insert sample rooms
INSERT INTO rooms (name, capacity, description, image_url) VALUES
  ('Room 1', 8, 'Small meeting room with projector and TV', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhW92Xms3PVXZwNiCuHAT4Gy7Pi510XmfzhQ&s'),
  ('Room 2', 12, 'Medium-sized conference room with whiteboard', '/placeholder.svg?height=300&width=600'),
  ('Room 3', 6, 'Small discussion room with TV and conference phone', '/placeholder.svg?height=300&width=600');

-- Link rooms with features
INSERT INTO room_features_junction (room_id, feature_id) VALUES
  (1, 1), -- Room 1 has Projector
  (1, 2), -- Room 1 has TV
  (2, 1), -- Room 2 has Projector
  (2, 3), -- Room 2 has Whiteboard
  (3, 2), -- Room 3 has TV
  (3, 4); -- Room 3 has Conference Phone

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, '', new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_rooms_timestamp
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_reservations_timestamp
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
