-- =====================================================
-- ADD TEST USERS TO SUPABASE DATABASE
-- Creates user1@test.no and user2@test.no
-- =====================================================

-- IMPORTANT: For Supabase, you need to create auth.users first
-- This can be done via Supabase Dashboard or API

-- Step 1: Create auth users in Supabase Dashboard
-- Go to Authentication > Users > Add User
-- User 1: user1@test.no (no password needed for email-only login)
-- User 2: user2@test.no (no password needed for email-only login)

-- Step 2: Run this script to create profiles and role-specific data

-- =====================================================
-- USER 1: WORKER (Thomas Testbruker)
-- =====================================================

DO $$
DECLARE
  worker_user_id UUID;
BEGIN
  -- Get the auth.users ID for user1@test.no
  SELECT id INTO worker_user_id FROM auth.users WHERE email = 'user1@test.no';
  
  IF worker_user_id IS NULL THEN
    RAISE EXCEPTION 'User user1@test.no not found in auth.users. Please create it in Supabase Dashboard first.';
  END IF;

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
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

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
    '9876543',
    'Sykepleier',
    450,
    4.5,
    10,
    'available',
    'Erfaren sykepleier med 8 års erfaring. Spesialisert i eldreomsorg.',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    profession = EXCLUDED.profession,
    hourly_rate = EXCLUDED.hourly_rate,
    status = EXCLUDED.status,
    bio = EXCLUDED.bio;

  RAISE NOTICE 'Created/Updated USER1 (Worker): Thomas Testbruker with ID %', worker_user_id;
END $$;

-- =====================================================
-- USER 2: EMPLOYER (Anne Testleder)
-- =====================================================

DO $$
DECLARE
  employer_user_id UUID;
BEGIN
  -- Get the auth.users ID for user2@test.no
  SELECT id INTO employer_user_id FROM auth.users WHERE email = 'user2@test.no';
  
  IF employer_user_id IS NULL THEN
    RAISE EXCEPTION 'User user2@test.no not found in auth.users. Please create it in Supabase Dashboard first.';
  END IF;

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
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

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
    'GRAN-USER2-001',
    'Testveien 1, 2770 Gran',
    '+47 12345678',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    municipality_name = EXCLUDED.municipality_name,
    department_name = EXCLUDED.department_name,
    address = EXCLUDED.address,
    contact_phone = EXCLUDED.contact_phone;

  RAISE NOTICE 'Created/Updated USER2 (Employer): Anne Testleder with ID %', employer_user_id;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 
  p.id,
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
WHERE p.email IN ('user1@test.no', 'user2@test.no')
ORDER BY p.username;