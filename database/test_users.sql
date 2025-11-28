-- =====================================================
-- TEST USERS FOR DATABASE TESTING
-- Creates two test accounts for development and testing
-- USER1 (password: USER1) - Healthcare Worker
-- USER2 (password: USER2) - Department Manager/Boss
-- =====================================================

-- Note: In production, passwords should be hashed using bcrypt or similar
-- For Supabase, you would typically use their auth.users table
-- This script assumes you're using a custom auth implementation or Supabase

-- =====================================================
-- TEST USER 1: WORKER (Thomas Sykepleier)
-- =====================================================

-- Insert into Supabase auth.users (if using Supabase)
-- You would typically do this through Supabase Dashboard or API
-- For testing, we'll create the profile directly

DO $$
DECLARE
  worker_user_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Insert profile for worker
  INSERT INTO profiles (
    id,
    email,
    username,
    full_name,
    role,
    personal_number,
    idporten_sub,
    security_level,
    created_at
  ) VALUES (
    worker_user_id,
    'user1@test.no',
    'user1',
    'Thomas Testbruker',
    'worker',
    '12088512345', -- Valid mock fødselsnummer
    'test-sub-user1',
    3,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name;

  -- Insert worker details
  INSERT INTO workers (
    id,
    hpr_number,
    profession,
    hourly_rate,
    average_rating,
    total_reviews,
    status,
    bio,
    created_at
  ) VALUES (
    worker_user_id,
    '1234567',
    'Sykepleier',
    450,
    4.5,
    10,
    'available',
    'Erfaren sykepleier med 8 års erfaring. Spesialisert i eldreomsorg.',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    hpr_number = EXCLUDED.hpr_number,
    profession = EXCLUDED.profession,
    hourly_rate = EXCLUDED.hourly_rate;

  RAISE NOTICE 'Created/Updated USER1 (Worker): Thomas Testbruker';
END $$;

-- =====================================================
-- TEST USER 2: EMPLOYER (Anne Testleder)
-- =====================================================

DO $$
DECLARE
  employer_user_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Insert profile for employer
  INSERT INTO profiles (
    id,
    email,
    username,
    full_name,
    role,
    personal_number,
    idporten_sub,
    security_level,
    created_at
  ) VALUES (
    employer_user_id,
    'user2@test.no',
    'user2',
    'Anne Testleder',
    'employer',
    '15067512345', -- Valid mock fødselsnummer
    'test-sub-user2',
    3,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name;

  -- Insert department details
  INSERT INTO departments (
    id,
    municipality_name,
    department_name,
    cost_center_code,
    address,
    contact_phone,
    created_at
  ) VALUES (
    employer_user_id,
    'Gran kommune',
    'Sykehjemmet avd. 2',
    'GRAN-TEST-001',
    'Testveien 1, 2770 Gran',
    '+47 12345678',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    municipality_name = EXCLUDED.municipality_name,
    department_name = EXCLUDED.department_name,
    cost_center_code = EXCLUDED.cost_center_code;

  RAISE NOTICE 'Created/Updated USER2 (Employer): Anne Testleder';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show created test users
SELECT 
  p.username,
  p.full_name,
  p.email,
  p.role,
  CASE 
    WHEN p.role = 'worker' THEN w.profession
    WHEN p.role = 'employer' THEN d.department_name
  END as details
FROM profiles p
LEFT JOIN workers w ON p.id = w.id
LEFT JOIN departments d ON p.id = d.id
WHERE p.username IN ('user1', 'user2')
ORDER BY p.username;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

/*
To use these test accounts:

1. Run this script in your PostgreSQL/Supabase database:
   psql -U postgres -d your_database < test_users.sql

2. For Supabase Auth integration, you need to create auth.users entries:
   
   In Supabase Dashboard > Authentication > Users:
   - Create user with email: user1@test.no, password: USER1
   - Create user with email: user2@test.no, password: USER2
   
   Then link them to the profiles:
   UPDATE profiles SET id = (SELECT id FROM auth.users WHERE email = 'user1@test.no')
   WHERE username = 'user1';
   
   UPDATE profiles SET id = (SELECT id FROM auth.users WHERE email = 'user2@test.no')
   WHERE username = 'user2';

3. Login credentials:
   
   WORKER (Healthcare Professional):
   - Username/Email: user1@test.no
   - Password: USER1
   - Role: Sykepleier (Nurse)
   - HPR: 1234567
   
   EMPLOYER (Department Manager):
   - Username/Email: user2@test.no
   - Password: USER2
   - Role: Avdelingsleder
   - Municipality: Gran kommune

4. Test the login flow:
   - Go to /login
   - Enter credentials
   - Verify role-specific dashboard access
*/