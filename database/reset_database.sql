-- =====================================================
-- RESET DATABASE
-- Drops all tables to start fresh
-- WARNING: This deletes ALL data!
-- =====================================================

-- Drop tables in reverse order of dependencies

-- Drop notification tables
DROP TABLE IF EXISTS shift_notifications CASCADE;
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS worker_locations CASCADE;

-- Drop availability tables
DROP TABLE IF EXISTS worker_availability CASCADE;

-- Drop communication tables
DROP TABLE IF EXISTS direct_messages CASCADE;

-- Drop quality tables
DROP TABLE IF EXISTS reviews CASCADE;

-- Drop contract tables
DROP TABLE IF EXISTS contracts CASCADE;

-- Drop application tables
DROP TABLE IF EXISTS shift_applications CASCADE;

-- Drop shift tables
DROP TABLE IF EXISTS shifts CASCADE;

-- Drop role-specific tables
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Drop profile tables
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop views
DROP VIEW IF EXISTS available_shifts CASCADE;
DROP VIEW IF EXISTS worker_profiles CASCADE;
DROP VIEW IF EXISTS eligible_workers_for_shift CASCADE;
DROP VIEW IF EXISTS workers_with_next_availability CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_worker_rating() CASCADE;
DROP FUNCTION IF EXISTS get_eligible_workers(UUID) CASCADE;
DROP FUNCTION IF EXISTS should_notify_worker(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS notify_eligible_workers_on_shift_create() CASCADE;
DROP FUNCTION IF EXISTS create_default_notification_preferences() CASCADE;
DROP FUNCTION IF EXISTS is_worker_available(UUID, TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS get_worker_upcoming_availability(UUID) CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database reset complete. All tables dropped.';
  RAISE NOTICE 'You can now run the schema files again.';
END $$;