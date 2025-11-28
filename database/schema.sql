-- =====================================================
-- HELSEPLATTFORM DATABASE SCHEMA
-- PostgreSQL/Supabase Schema for Norwegian Health Platform
-- Supports 1000+ healthcare workers and 50+ departments
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. USERS & PROFILES
-- =====================================================

-- Main profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL, -- Unique username for the platform
  full_name TEXT NOT NULL, -- Real name from ID-porten (displayed)
  role TEXT NOT NULL CHECK (role IN ('worker', 'employer')),
  avatar_url TEXT,
  
  -- ID-porten integration fields
  personal_number TEXT UNIQUE NOT NULL, -- Fødselsnummer (11 digits) - encrypted
  idporten_sub TEXT UNIQUE, -- ID-porten subject identifier
  idporten_pid TEXT, -- ID-porten persistent identifier
  security_level INTEGER CHECK (security_level IN (3, 4)), -- ID-porten security level (3=substantial, 4=high)
  last_idporten_login TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_personal_number ON profiles(personal_number);
CREATE INDEX idx_profiles_idporten_sub ON profiles(idporten_sub);

-- =====================================================
-- 2. SPECIFIC ROLES
-- =====================================================

-- Workers table (healthcare professionals)
CREATE TABLE workers (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  hpr_number TEXT UNIQUE NOT NULL CHECK (length(hpr_number) >= 7 AND length(hpr_number) <= 9),
  profession TEXT NOT NULL CHECK (profession IN ('Sykepleier', 'Helsefagarbeider', 'Lege', 'Vernepleier')),
  hourly_rate INTEGER NOT NULL CHECK (hourly_rate > 0),
  average_rating DECIMAL(3,2) DEFAULT 0.00 CHECK (average_rating >= 0 AND average_rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'inactive')),
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for worker searches
CREATE INDEX idx_workers_profession ON workers(profession);
CREATE INDEX idx_workers_status ON workers(status);
CREATE INDEX idx_workers_hpr ON workers(hpr_number);
CREATE INDEX idx_workers_rating ON workers(average_rating DESC);

-- Departments table (municipal employers)
CREATE TABLE departments (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  municipality_name TEXT NOT NULL,
  department_name TEXT NOT NULL,
  cost_center_code TEXT UNIQUE NOT NULL,
  address TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for department searches
CREATE INDEX idx_departments_municipality ON departments(municipality_name);
CREATE INDEX idx_departments_cost_center ON departments(cost_center_code);

-- =====================================================
-- 3. CORE DOMAIN: SHIFTS (VAKTER)
-- =====================================================

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'completed', 'cancelled')),
  profession_required TEXT NOT NULL CHECK (profession_required IN ('Sykepleier', 'Helsefagarbeider', 'Lege', 'Vernepleier')),
  description TEXT,
  hourly_wage INTEGER NOT NULL CHECK (hourly_wage > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Business logic constraint: end_time must be after start_time
  CONSTRAINT valid_shift_time CHECK (end_time > start_time),
  
  -- Ensure shifts are at least 2 hours (optional business rule)
  CONSTRAINT minimum_shift_duration CHECK (end_time >= start_time + INTERVAL '2 hours')
);

-- Create indexes for shift queries
CREATE INDEX idx_shifts_department ON shifts(department_id);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_profession ON shifts(profession_required);
CREATE INDEX idx_shifts_start_time ON shifts(start_time);
-- Note: Removed partial index with NOW() as it's not immutable in Supabase
-- Use query filters instead: WHERE status = 'open' AND start_time > NOW()

-- =====================================================
-- 4. THE PROCESS: APPLICATIONS & CONTRACTS
-- =====================================================

-- Shift applications (workers apply for shifts)
CREATE TABLE shift_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate applications
  UNIQUE(shift_id, worker_id)
);

-- Create indexes for application queries
CREATE INDEX idx_applications_shift ON shift_applications(shift_id);
CREATE INDEX idx_applications_worker ON shift_applications(worker_id);
CREATE INDEX idx_applications_status ON shift_applications(status);

-- Contracts (approved applications become contracts)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  pdf_url TEXT, -- Placeholder for future document storage
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'archived')),
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One contract per shift
  UNIQUE(shift_id)
);

-- Create indexes for contract queries
CREATE INDEX idx_contracts_shift ON contracts(shift_id);
CREATE INDEX idx_contracts_worker ON contracts(worker_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- =====================================================
-- 5. QUALITY & COMMUNICATION
-- =====================================================

-- Reviews (employers rate workers after completed shifts)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One review per shift
  UNIQUE(shift_id, reviewer_id)
);

-- Create indexes for review queries
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX idx_reviews_shift ON reviews(shift_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Direct messages (chat between workers and departments)
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent self-messaging
  CONSTRAINT no_self_messaging CHECK (sender_id != receiver_id)
);

-- Create indexes for message queries
CREATE INDEX idx_messages_sender ON direct_messages(sender_id);
CREATE INDEX idx_messages_receiver ON direct_messages(receiver_id);
CREATE INDEX idx_messages_unread ON direct_messages(receiver_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_messages_conversation ON direct_messages(sender_id, receiver_id, created_at);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON shift_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update worker average rating
CREATE OR REPLACE FUNCTION update_worker_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workers
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE reviewee_id = NEW.reviewee_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE reviewee_id = NEW.reviewee_id
    )
  WHERE id = NEW.reviewee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rating after new review
CREATE TRIGGER update_rating_after_review
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION update_worker_rating();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles but only update their own
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Workers: Public read, workers can update their own
CREATE POLICY "Workers are viewable by everyone"
  ON workers FOR SELECT
  USING (true);

CREATE POLICY "Workers can update own profile"
  ON workers FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Workers can insert own profile"
  ON workers FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Departments: Public read, departments can update their own
CREATE POLICY "Departments are viewable by everyone"
  ON departments FOR SELECT
  USING (true);

CREATE POLICY "Departments can update own profile"
  ON departments FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Departments can insert own profile"
  ON departments FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Shifts: Public read for open shifts, departments can manage their own
CREATE POLICY "Open shifts are viewable by everyone"
  ON shifts FOR SELECT
  USING (status = 'open' OR department_id IN (
    SELECT id FROM departments WHERE id = auth.uid()
  ));

CREATE POLICY "Departments can create shifts"
  ON shifts FOR INSERT
  WITH CHECK (department_id IN (
    SELECT id FROM departments WHERE id = auth.uid()
  ));

CREATE POLICY "Departments can update own shifts"
  ON shifts FOR UPDATE
  USING (department_id IN (
    SELECT id FROM departments WHERE id = auth.uid()
  ));

-- Shift Applications: Workers see their own, departments see applications for their shifts
CREATE POLICY "Workers can view own applications"
  ON shift_applications FOR SELECT
  USING (worker_id = auth.uid() OR EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.id = shift_applications.shift_id
    AND s.department_id = auth.uid()
  ));

CREATE POLICY "Workers can create applications"
  ON shift_applications FOR INSERT
  WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Workers can update own applications"
  ON shift_applications FOR UPDATE
  USING (worker_id = auth.uid());

CREATE POLICY "Departments can update applications for their shifts"
  ON shift_applications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.id = shift_applications.shift_id
    AND s.department_id = auth.uid()
  ));

-- Contracts: Visible to both parties
CREATE POLICY "Contracts viewable by involved parties"
  ON contracts FOR SELECT
  USING (
    worker_id = auth.uid() OR EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = contracts.shift_id
      AND s.department_id = auth.uid()
    )
  );

CREATE POLICY "Departments can create contracts"
  ON contracts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.id = shift_id
    AND s.department_id = auth.uid()
  ));

CREATE POLICY "Departments can update contracts"
  ON contracts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.id = contracts.shift_id
    AND s.department_id = auth.uid()
  ));

-- Reviews: Public read, only reviewers can create
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Departments can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM departments WHERE id = auth.uid()
    )
  );

-- Direct Messages: Only sender and receiver can see
CREATE POLICY "Users can view own messages"
  ON direct_messages FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON direct_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Receivers can update read status"
  ON direct_messages FOR UPDATE
  USING (receiver_id = auth.uid());

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View for available shifts with department info
CREATE VIEW available_shifts AS
SELECT 
  s.*,
  d.municipality_name,
  d.department_name,
  d.cost_center_code
FROM shifts s
JOIN departments d ON s.department_id = d.id
WHERE s.status = 'open' AND s.start_time > NOW()
ORDER BY s.start_time;

-- View for worker profiles with ratings
CREATE VIEW worker_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.avatar_url,
  w.hpr_number,
  w.profession,
  w.hourly_rate,
  w.average_rating,
  w.total_reviews,
  w.status,
  w.bio
FROM profiles p
JOIN workers w ON p.id = w.id
WHERE p.role = 'worker';

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE profiles IS 'Main user profiles extending Supabase auth.users';
COMMENT ON TABLE workers IS 'Healthcare worker specific data including HPR number and ratings';
COMMENT ON TABLE departments IS 'Municipal department/employer data';
COMMENT ON TABLE shifts IS 'Available work shifts posted by departments';
COMMENT ON TABLE shift_applications IS 'Worker applications for shifts';
COMMENT ON TABLE contracts IS 'Approved applications become active contracts';
COMMENT ON TABLE reviews IS 'Employer ratings of workers after completed shifts';
COMMENT ON TABLE direct_messages IS 'Direct messaging between users';

COMMENT ON COLUMN profiles.username IS 'Unique username for the platform (user-chosen or auto-generated)';
COMMENT ON COLUMN profiles.full_name IS 'Real name from ID-porten - displayed to other users';
COMMENT ON COLUMN profiles.personal_number IS 'Norwegian fødselsnummer (11 digits) - encrypted for privacy';
COMMENT ON COLUMN profiles.idporten_sub IS 'ID-porten subject identifier from OIDC token';
COMMENT ON COLUMN profiles.security_level IS 'ID-porten authentication security level (3=substantial, 4=high)';
COMMENT ON COLUMN workers.hpr_number IS 'Helsepersonellregister number (7-9 digits) - required for Norwegian healthcare workers';
COMMENT ON COLUMN departments.cost_center_code IS 'Internal accounting code for invoicing';
COMMENT ON COLUMN shifts.hourly_wage IS 'Wage offered for this shift in NOK';
COMMENT ON COLUMN reviews.rating IS 'Rating from 1-5 stars';