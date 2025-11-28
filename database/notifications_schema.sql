-- =====================================================
-- NOTIFICATION SYSTEM SCHEMA
-- Extends the main schema with notification capabilities
-- Supports email, SMS, and push notifications
-- =====================================================

-- =====================================================
-- 1. NOTIFICATION PREFERENCES
-- =====================================================

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Email notifications
  email_enabled BOOLEAN DEFAULT TRUE,
  email_new_shifts BOOLEAN DEFAULT TRUE,
  email_shift_updates BOOLEAN DEFAULT TRUE,
  email_applications BOOLEAN DEFAULT TRUE,
  email_messages BOOLEAN DEFAULT TRUE,
  
  -- SMS notifications
  sms_enabled BOOLEAN DEFAULT FALSE,
  sms_new_shifts BOOLEAN DEFAULT FALSE,
  sms_shift_updates BOOLEAN DEFAULT TRUE,
  sms_urgent_only BOOLEAN DEFAULT TRUE,
  phone_number TEXT,
  
  -- Push notifications
  push_enabled BOOLEAN DEFAULT TRUE,
  push_new_shifts BOOLEAN DEFAULT TRUE,
  push_shift_updates BOOLEAN DEFAULT TRUE,
  push_applications BOOLEAN DEFAULT TRUE,
  push_messages BOOLEAN DEFAULT TRUE,
  push_token TEXT, -- FCM/OneSignal token
  
  -- Notification timing
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'Europe/Oslo',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_prefs_push_token ON notification_preferences(push_token) WHERE push_token IS NOT NULL;

-- =====================================================
-- 2. NOTIFICATION QUEUE
-- =====================================================

CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification details
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'push')),
  channel TEXT NOT NULL CHECK (channel IN ('new_shift', 'shift_update', 'application', 'message', 'reminder')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Additional data (shift_id, application_id, etc.)
  
  -- Delivery
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Tracking
  provider TEXT, -- 'sendgrid', 'twilio', 'onesignal', etc.
  provider_id TEXT, -- External provider's message ID
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_user ON notification_queue(user_id);
CREATE INDEX idx_notification_queue_status ON notification_queue(status, scheduled_for);
CREATE INDEX idx_notification_queue_type ON notification_queue(type);
CREATE INDEX idx_notification_queue_channel ON notification_queue(channel);

-- =====================================================
-- 3. WORKER LOCATIONS (for matching)
-- =====================================================

CREATE TABLE worker_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  
  -- Location preferences
  municipality_id TEXT NOT NULL,
  municipality_name TEXT NOT NULL,
  max_distance_km INTEGER DEFAULT 20,
  is_primary BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(worker_id, municipality_id)
);

CREATE INDEX idx_worker_locations_worker ON worker_locations(worker_id);
CREATE INDEX idx_worker_locations_municipality ON worker_locations(municipality_id);

-- =====================================================
-- 4. SHIFT NOTIFICATIONS (tracking who was notified)
-- =====================================================

CREATE TABLE shift_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  
  -- Notification status
  notified_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  
  -- Channels used
  email_sent BOOLEAN DEFAULT FALSE,
  sms_sent BOOLEAN DEFAULT FALSE,
  push_sent BOOLEAN DEFAULT FALSE,
  
  UNIQUE(shift_id, worker_id)
);

CREATE INDEX idx_shift_notifications_shift ON shift_notifications(shift_id);
CREATE INDEX idx_shift_notifications_worker ON shift_notifications(worker_id);
CREATE INDEX idx_shift_notifications_viewed ON shift_notifications(viewed_at) WHERE viewed_at IS NULL;

-- =====================================================
-- 5. ELIGIBLE WORKERS VIEW
-- =====================================================

-- View to find eligible workers for a shift
CREATE OR REPLACE VIEW eligible_workers_for_shift AS
SELECT 
  s.id as shift_id,
  s.profession_required,
  s.start_time,
  s.hourly_wage,
  w.id as worker_id,
  p.full_name as worker_name,
  p.username,
  w.profession,
  w.hourly_rate as worker_rate,
  w.average_rating,
  w.total_reviews,
  w.status,
  wl.municipality_name as worker_location,
  wl.max_distance_km,
  d.municipality_name as shift_municipality,
  
  -- Matching score (higher is better)
  CASE 
    WHEN w.hourly_rate <= s.hourly_wage THEN 100
    WHEN w.hourly_rate <= s.hourly_wage * 1.1 THEN 80
    WHEN w.hourly_rate <= s.hourly_wage * 1.2 THEN 60
    ELSE 40
  END +
  CASE 
    WHEN w.average_rating >= 4.5 THEN 50
    WHEN w.average_rating >= 4.0 THEN 30
    WHEN w.average_rating >= 3.5 THEN 10
    ELSE 0
  END +
  CASE 
    WHEN w.total_reviews >= 10 THEN 20
    WHEN w.total_reviews >= 5 THEN 10
    ELSE 0
  END as match_score

FROM shifts s
JOIN departments d ON s.department_id = d.id
CROSS JOIN workers w
JOIN profiles p ON w.id = p.id
LEFT JOIN worker_locations wl ON w.id = wl.worker_id AND wl.municipality_id = d.municipality_name
WHERE 
  -- Must match profession
  w.profession = s.profession_required
  -- Must be available
  AND w.status = 'available'
  -- Shift must be open
  AND s.status = 'open'
  -- Shift must be in the future
  AND s.start_time > NOW()
  -- Worker hasn't already applied
  AND NOT EXISTS (
    SELECT 1 FROM shift_applications sa 
    WHERE sa.shift_id = s.id AND sa.worker_id = w.id
  )
ORDER BY match_score DESC, w.average_rating DESC;

-- =====================================================
-- 6. FUNCTIONS FOR WORKER MATCHING
-- =====================================================

-- Function to get eligible workers for a specific shift
CREATE OR REPLACE FUNCTION get_eligible_workers(shift_uuid UUID)
RETURNS TABLE (
  worker_id UUID,
  worker_name TEXT,
  username TEXT,
  profession TEXT,
  hourly_rate INTEGER,
  average_rating DECIMAL,
  total_reviews INTEGER,
  match_score INTEGER,
  location TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ew.worker_id,
    ew.worker_name,
    ew.username,
    ew.profession,
    ew.worker_rate,
    ew.average_rating,
    ew.total_reviews,
    ew.match_score,
    ew.worker_location
  FROM eligible_workers_for_shift ew
  WHERE ew.shift_id = shift_uuid
  ORDER BY ew.match_score DESC, ew.average_rating DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function to check if worker should be notified about a shift
CREATE OR REPLACE FUNCTION should_notify_worker(
  worker_uuid UUID,
  shift_uuid UUID
) RETURNS BOOLEAN AS $$
DECLARE
  worker_prefs RECORD;
  shift_info RECORD;
  already_notified BOOLEAN;
BEGIN
  -- Get worker preferences
  SELECT * INTO worker_prefs
  FROM notification_preferences
  WHERE user_id = worker_uuid;
  
  -- Get shift info
  SELECT * INTO shift_info
  FROM shifts
  WHERE id = shift_uuid;
  
  -- Check if already notified
  SELECT EXISTS (
    SELECT 1 FROM shift_notifications
    WHERE shift_id = shift_uuid AND worker_id = worker_uuid
  ) INTO already_notified;
  
  -- Don't notify if already notified
  IF already_notified THEN
    RETURN FALSE;
  END IF;
  
  -- Check if notifications are enabled
  IF worker_prefs IS NULL OR NOT worker_prefs.email_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check quiet hours
  IF worker_prefs.quiet_hours_start IS NOT NULL AND worker_prefs.quiet_hours_end IS NOT NULL THEN
    IF CURRENT_TIME BETWEEN worker_prefs.quiet_hours_start AND worker_prefs.quiet_hours_end THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGER TO CREATE NOTIFICATIONS
-- =====================================================

-- Function to notify eligible workers when a shift is created
CREATE OR REPLACE FUNCTION notify_eligible_workers_on_shift_create()
RETURNS TRIGGER AS $$
DECLARE
  eligible_worker RECORD;
  notification_id UUID;
BEGIN
  -- Only notify for new open shifts
  IF NEW.status != 'open' THEN
    RETURN NEW;
  END IF;
  
  -- Find all eligible workers
  FOR eligible_worker IN 
    SELECT * FROM get_eligible_workers(NEW.id)
  LOOP
    -- Check if worker should be notified
    IF should_notify_worker(eligible_worker.worker_id, NEW.id) THEN
      
      -- Create notification queue entry for email
      INSERT INTO notification_queue (
        user_id,
        type,
        channel,
        priority,
        title,
        body,
        data
      ) VALUES (
        eligible_worker.worker_id,
        'email',
        'new_shift',
        'normal',
        'Ny vakt tilgjengelig',
        'En ny vakt som matcher din profil er nå tilgjengelig.',
        jsonb_build_object(
          'shift_id', NEW.id,
          'profession', NEW.profession_required,
          'start_time', NEW.start_time,
          'hourly_wage', NEW.hourly_wage,
          'match_score', eligible_worker.match_score
        )
      );
      
      -- Create push notification if enabled
      INSERT INTO notification_queue (
        user_id,
        type,
        channel,
        priority,
        title,
        body,
        data
      )
      SELECT 
        eligible_worker.worker_id,
        'push',
        'new_shift',
        'normal',
        'Ny vakt tilgjengelig',
        NEW.profession_required || ' - ' || to_char(NEW.start_time, 'DD.MM.YYYY HH24:MI'),
        jsonb_build_object(
          'shift_id', NEW.id,
          'profession', NEW.profession_required,
          'start_time', NEW.start_time,
          'hourly_wage', NEW.hourly_wage
        )
      FROM notification_preferences np
      WHERE np.user_id = eligible_worker.worker_id
      AND np.push_enabled = TRUE
      AND np.push_new_shifts = TRUE;
      
      -- Track that worker was notified
      INSERT INTO shift_notifications (
        shift_id,
        worker_id,
        email_sent,
        push_sent
      ) VALUES (
        NEW.id,
        eligible_worker.worker_id,
        TRUE,
        EXISTS (
          SELECT 1 FROM notification_preferences
          WHERE user_id = eligible_worker.worker_id
          AND push_enabled = TRUE
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_notify_workers_on_shift_create
AFTER INSERT ON shifts
FOR EACH ROW
EXECUTE FUNCTION notify_eligible_workers_on_shift_create();

-- =====================================================
-- 8. RLS POLICIES FOR NEW TABLES
-- =====================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_notifications ENABLE ROW LEVEL SECURITY;

-- Notification preferences: users can only see/edit their own
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Notification queue: users can only see their own
CREATE POLICY "Users can view own notifications"
  ON notification_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Worker locations: public read, workers can manage their own
CREATE POLICY "Worker locations are viewable by everyone"
  ON worker_locations FOR SELECT
  USING (true);

CREATE POLICY "Workers can manage own locations"
  ON worker_locations FOR ALL
  USING (auth.uid() = worker_id);

-- Shift notifications: users can see their own
CREATE POLICY "Users can view own shift notifications"
  ON shift_notifications FOR SELECT
  USING (auth.uid() = worker_id);

-- =====================================================
-- 9. DEFAULT NOTIFICATION PREFERENCES
-- =====================================================

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default preferences
CREATE TRIGGER trigger_create_default_notification_prefs
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_default_notification_preferences();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE notification_preferences IS 'User notification preferences for email, SMS, and push notifications';
COMMENT ON TABLE notification_queue IS 'Queue of notifications to be sent to users';
COMMENT ON TABLE worker_locations IS 'Worker location preferences for shift matching';
COMMENT ON TABLE shift_notifications IS 'Tracks which workers were notified about which shifts';

COMMENT ON COLUMN notification_preferences.quiet_hours_start IS 'Start of quiet hours (no notifications)';
COMMENT ON COLUMN notification_preferences.quiet_hours_end IS 'End of quiet hours';
COMMENT ON COLUMN notification_queue.data IS 'JSON data with shift_id, application_id, etc.';
COMMENT ON COLUMN notification_queue.provider_id IS 'External provider message ID for tracking';