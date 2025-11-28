-- =====================================================
-- WORKER AVAILABILITY SCHEMA
-- Allows workers to post their available time slots
-- =====================================================

-- =====================================================
-- WORKER AVAILABILITY TABLE
-- =====================================================

CREATE TABLE worker_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  
  -- Time slot
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  -- Recurrence (optional)
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly')),
  recurrence_end_date DATE,
  
  -- Preferences
  preferred_shift_types TEXT[] DEFAULT ARRAY['day', 'evening', 'night', 'weekend'],
  notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Business logic constraints
  CONSTRAINT valid_availability_time CHECK (end_time > start_time),
  CONSTRAINT minimum_availability_duration CHECK (end_time >= start_time + INTERVAL '4 hours')
);

-- Indexes
CREATE INDEX idx_worker_availability_worker ON worker_availability(worker_id);
CREATE INDEX idx_worker_availability_time ON worker_availability(start_time, end_time);
CREATE INDEX idx_worker_availability_status ON worker_availability(status);
-- Note: Removed partial index with NOW() as it's not immutable in Supabase
-- Use query filters instead: WHERE status = 'available' AND start_time > NOW()

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE worker_availability ENABLE ROW LEVEL SECURITY;

-- Workers can view all availabilities (for coordination)
CREATE POLICY "Availabilities are viewable by authenticated users"
  ON worker_availability FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Workers can manage their own availability
CREATE POLICY "Workers can insert own availability"
  ON worker_availability FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Workers can update own availability"
  ON worker_availability FOR UPDATE
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can delete own availability"
  ON worker_availability FOR DELETE
  USING (auth.uid() = worker_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE TRIGGER update_worker_availability_updated_at
BEFORE UPDATE ON worker_availability
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if worker is available for a specific time slot
CREATE OR REPLACE FUNCTION is_worker_available(
  worker_uuid UUID,
  check_start_time TIMESTAMPTZ,
  check_end_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM worker_availability
    WHERE worker_id = worker_uuid
    AND status = 'available'
    AND start_time <= check_start_time
    AND end_time >= check_end_time
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get worker's upcoming availability
CREATE OR REPLACE FUNCTION get_worker_upcoming_availability(worker_uuid UUID)
RETURNS TABLE (
  id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_hours NUMERIC,
  is_recurring BOOLEAN,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wa.id,
    wa.start_time,
    wa.end_time,
    EXTRACT(EPOCH FROM (wa.end_time - wa.start_time)) / 3600 as duration_hours,
    wa.is_recurring,
    wa.status
  FROM worker_availability wa
  WHERE wa.worker_id = worker_uuid
  AND wa.start_time > NOW()
  AND wa.status = 'available'
  ORDER BY wa.start_time;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS
-- =====================================================

-- View for available workers with their next available slot
CREATE VIEW workers_with_next_availability AS
SELECT 
  w.id as worker_id,
  p.full_name,
  p.username,
  w.profession,
  w.hourly_rate,
  w.average_rating,
  w.status,
  (
    SELECT MIN(wa.start_time)
    FROM worker_availability wa
    WHERE wa.worker_id = w.id
    AND wa.status = 'available'
    AND wa.start_time > NOW()
  ) as next_available_time
FROM workers w
JOIN profiles p ON w.id = p.id
WHERE w.status = 'available';

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE worker_availability IS 'Worker availability time slots for shift matching';
COMMENT ON COLUMN worker_availability.is_recurring IS 'Whether this availability repeats';
COMMENT ON COLUMN worker_availability.recurrence_pattern IS 'How often the availability repeats';
COMMENT ON COLUMN worker_availability.preferred_shift_types IS 'Preferred types of shifts during this time';