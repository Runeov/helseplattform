-- =====================================================
-- SIMPLE TEST DATA
-- Creates a few test users WITHOUT auth.users dependency
-- Use this ONLY if you want to bypass Supabase Auth
-- =====================================================

-- IMPORTANT: This requires modifying the profiles table first
-- Run this SQL to remove the auth.users foreign key:

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Now you can insert test profiles directly:

-- Test Worker 1
INSERT INTO profiles (id, email, username, full_name, role, personal_number)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'worker1@test.no',
  'worker1',
  'Test Worker 1',
  'worker',
  '01019012345'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO workers (id, hpr_number, profession, hourly_rate, status, bio)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '1234567',
  'Sykepleier',
  450,
  'available',
  'Erfaren sykepleier'
) ON CONFLICT (id) DO NOTHING;

-- Test Worker 2
INSERT INTO profiles (id, email, username, full_name, role, personal_number)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'worker2@test.no',
  'worker2',
  'Test Worker 2',
  'worker',
  '02029012345'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO workers (id, hpr_number, profession, hourly_rate, status, bio)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '2345678',
  'Helsefagarbeider',
  380,
  'available',
  'Erfaren helsefagarbeider'
) ON CONFLICT (id) DO NOTHING;

-- Test Employer
INSERT INTO profiles (id, email, username, full_name, role, personal_number)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'employer1@test.no',
  'employer1',
  'Test Employer 1',
  'employer',
  '15067512345'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO departments (id, municipality_name, department_name, cost_center_code)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Gran kommune',
  'Sykehjemmet avd. 2',
  'GRAN-TEST-001'
) ON CONFLICT (id) DO NOTHING;

-- Verification
SELECT 
  p.username,
  p.full_name,
  p.role,
  CASE 
    WHEN p.role = 'worker' THEN w.profession
    WHEN p.role = 'employer' THEN d.department_name
  END as details
FROM profiles p
LEFT JOIN workers w ON p.id = w.id
LEFT JOIN departments d ON p.id = d.id
ORDER BY p.username;