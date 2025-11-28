-- =====================================================
-- REALISTIC TEST DATA
-- Creates 500 workers, 20 employers, with realistic availability and shifts
-- Ratio: 25 workers per employer
-- =====================================================

-- IMPORTANT: This script temporarily removes the auth.users foreign key
-- to allow creating test profiles without Supabase Auth users

-- Remove foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION random_norwegian_name()
RETURNS TEXT AS $$
DECLARE
  first_names TEXT[] := ARRAY['Ole', 'Kari', 'Per', 'Anne', 'Lars', 'Ingrid', 'Erik', 'Marit', 'Thomas', 'Lise', 'Anders', 'Kristin', 'Martin', 'Heidi', 'Jonas', 'Maria'];
  last_names TEXT[] := ARRAY['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Jensen', 'Berg'];
BEGIN
  RETURN first_names[floor(random() * array_length(first_names, 1) + 1)] || ' ' || 
         last_names[floor(random() * array_length(last_names, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_simple_personal_number()
RETURNS TEXT AS $$
DECLARE
  day TEXT := lpad((floor(random() * 28) + 1)::TEXT, 2, '0');
  month TEXT := lpad((floor(random() * 12) + 1)::TEXT, 2, '0');
  year TEXT := lpad((floor(random() * 30) + 70)::TEXT, 2, '0');
  individual TEXT := lpad((floor(random() * 500))::TEXT, 3, '0');
BEGIN
  RETURN day || month || year || individual || '00';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE 50 WORKERS
-- =====================================================

DO $$
DECLARE
  worker_count INTEGER := 500;
  idx INTEGER;
  worker_uuid UUID;
  worker_name TEXT;
  worker_username TEXT;
  profession TEXT;
  professions TEXT[] := ARRAY['Sykepleier', 'Helsefagarbeider', 'Lege', 'Vernepleier'];
  hourly_rate INTEGER;
  bio_templates TEXT[] := ARRAY[
    'Erfaren %s med %s års erfaring. Spesialisert i eldreomsorg.',
    'Dedikert %s som brenner for pasientomsorg. %s års erfaring.',
    'Profesjonell %s med bred erfaring. Jobbet i helsevesenet i %s år.',
    'Kvalifisert %s med fokus på kvalitet. %s års erfaring innen helse.'
  ];
BEGIN
  FOR idx IN 1..worker_count LOOP
    worker_uuid := uuid_generate_v4();
    worker_name := random_norwegian_name();
    worker_username := 'worker' || idx;
    profession := professions[floor(random() * array_length(professions, 1) + 1)];
    
    -- Calculate rate based on profession
    hourly_rate := CASE profession
      WHEN 'Lege' THEN 600 + floor(random() * 200)
      WHEN 'Sykepleier' THEN 400 + floor(random() * 150)
      WHEN 'Vernepleier' THEN 380 + floor(random() * 120)
      WHEN 'Helsefagarbeider' THEN 320 + floor(random() * 100)
    END;
    
    -- Insert profile
    INSERT INTO profiles (id, email, username, full_name, role, personal_number)
    VALUES (
      worker_uuid,
      worker_username || '@helsepersonell.no',
      worker_username,
      worker_name,
      'worker',
      generate_simple_personal_number()
    );
    
    -- Insert worker
    INSERT INTO workers (id, hpr_number, profession, hourly_rate, status, bio)
    VALUES (
      worker_uuid,
      lpad((1000000 + idx)::TEXT, 7, '0'),
      profession,
      hourly_rate,
      CASE WHEN random() < 0.8 THEN 'available' ELSE 'busy' END,
      format(
        bio_templates[floor(random() * array_length(bio_templates, 1) + 1)],
        lower(profession),
        (5 + floor(random() * 15))::TEXT
      )
    );
    
    -- Add 2-4 availability slots per worker
    DECLARE
      slot_start TIMESTAMPTZ;
      slot_duration INTEGER;
    BEGIN
      FOR slot IN 1..(2 + floor(random() * 3)) LOOP
        -- Calculate start time (random day in next 30 days, random hour)
        slot_start := NOW() + (floor(random() * 30) || ' days')::INTERVAL + (floor(random() * 16) || ' hours')::INTERVAL;
        -- Duration: 4-12 hours
        slot_duration := 4 + floor(random() * 9);
        
        INSERT INTO worker_availability (
          worker_id,
          start_time,
          end_time,
          preferred_shift_types,
          notes,
          status
        ) VALUES (
          worker_uuid,
          slot_start,
          slot_start + (slot_duration || ' hours')::INTERVAL,
          CASE
            WHEN random() < 0.25 THEN ARRAY['day']
            WHEN random() < 0.5 THEN ARRAY['evening', 'night']
            WHEN random() < 0.75 THEN ARRAY['day', 'evening']
            ELSE ARRAY['day', 'evening', 'night', 'weekend']
          END,
          CASE
            WHEN random() < 0.3 THEN 'Kan ta ekstravakter med kort varsel'
            WHEN random() < 0.6 THEN 'Foretrekker nattevakter'
            ELSE NULL
          END,
          'available'
        );
      END LOOP;
    END;
  END LOOP;
  
  RAISE NOTICE 'Created % workers with availability', worker_count;
END $$;

-- =====================================================
-- CREATE 2 EMPLOYERS
-- =====================================================

DO $$
DECLARE
  employer_count INTEGER := 20;
  idx INTEGER;
  employer_uuid UUID;
  municipalities TEXT[] := ARRAY[
    'Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Bærum', 'Kristiansand', 'Fredrikstad',
    'Sandnes', 'Tromsø', 'Drammen', 'Asker', 'Lillestrøm', 'Skien', 'Ålesund',
    'Sandefjord', 'Haugesund', 'Tønsberg', 'Moss', 'Bodø', 'Arendal'
  ];
  departments TEXT[] := ARRAY[
    'Sykehjem avdeling 1', 'Sykehjem avdeling 2', 'Hjemmetjenesten', 'Akuttavdelingen',
    'Rehabilitering', 'Psykisk helse', 'Rus og avhengighet', 'Habiliteringstjenesten',
    'Dagsenter', 'Korttidsavdeling', 'Demensavdeling', 'Palliativ avdeling',
    'Omsorgsboliger', 'Aktivitetssenter', 'Eldresenter', 'Bofellesskap',
    'Dagaktivitet', 'Hjemmesykepleie', 'Legevakt', 'Rehabiliteringssenter'
  ];
  municipality TEXT;
  department TEXT;
BEGIN
  FOR idx IN 1..employer_count LOOP
    employer_uuid := uuid_generate_v4();
    municipality := municipalities[idx];
    department := departments[idx];
    
    -- Insert profile
    INSERT INTO profiles (id, email, username, full_name, role, personal_number)
    VALUES (
      employer_uuid,
      'employer' || idx || '@' || lower(replace(municipality, ' ', '')) || '.kommune.no',
      'employer' || idx,
      'Avdelingsleder ' || municipality,
      'employer',
      generate_simple_personal_number()
    );
    
    -- Insert department
    INSERT INTO departments (id, municipality_name, department_name, cost_center_code)
    VALUES (
      employer_uuid,
      municipality || ' kommune',
      department,
      upper(substring(municipality from 1 for 4)) || '-' || lpad(idx::TEXT, 3, '0')
    );
  END LOOP;
  
  RAISE NOTICE 'Created % employers', employer_count;
END $$;

-- =====================================================
-- CREATE SHIFTS (2 per employer = 40 total)
-- =====================================================

DO $$
DECLARE
  dept RECORD;
  shift_count INTEGER;
  profession TEXT;
  professions TEXT[] := ARRAY['Sykepleier', 'Helsefagarbeider', 'Lege', 'Vernepleier'];
  descriptions TEXT[] := ARRAY[
    'Nattevakt på sykehjem. Erfaring med eldre pasienter ønskes.',
    'Dagvakt i hjemmetjenesten. Gode norskkunnskaper viktig.',
    'Helgevakt. Fleksibel og pålitelig person søkes.',
    'Kveldsvakt. Erfaring med demens er en fordel.'
  ];
BEGIN
  DECLARE
    shift_start TIMESTAMPTZ;
    shift_type INTEGER;
  BEGIN
    FOR dept IN SELECT id FROM departments LOOP
      shift_count := 2;
      
      FOR idx IN 1..shift_count LOOP
        profession := professions[floor(random() * array_length(professions, 1) + 1)];
        
        -- Random day in next 14 days
        shift_start := NOW() + (floor(random() * 14) + 1 || ' days')::INTERVAL;
        
        -- Random shift type: 0=day, 1=evening, 2=night, 3=weekend
        shift_type := floor(random() * 4);
        
        -- Set times based on shift type
        shift_start := shift_start + CASE shift_type
          WHEN 0 THEN '08:00:00'::INTERVAL  -- Dagvakt
          WHEN 1 THEN '16:00:00'::INTERVAL  -- Kveldsvakt
          WHEN 2 THEN '22:00:00'::INTERVAL  -- Nattevakt
          ELSE '08:00:00'::INTERVAL         -- Helgevakt
        END;
        
        INSERT INTO shifts (
          department_id,
          start_time,
          end_time,
          profession_required,
          hourly_wage,
          description,
          status
        ) VALUES (
          dept.id,
          shift_start,
          shift_start + CASE shift_type
            WHEN 0 THEN '8 hours'::INTERVAL   -- Dagvakt 8 hours
            WHEN 1 THEN '8 hours'::INTERVAL   -- Kveldsvakt 8 hours
            WHEN 2 THEN '8 hours'::INTERVAL   -- Nattevakt 8 hours
            ELSE '12 hours'::INTERVAL         -- Helgevakt 12 hours
          END,
          profession,
          CASE profession
            WHEN 'Lege' THEN 650 + floor(random() * 150)
            WHEN 'Sykepleier' THEN 450 + floor(random() * 100)
            WHEN 'Vernepleier' THEN 400 + floor(random() * 80)
            WHEN 'Helsefagarbeider' THEN 350 + floor(random() * 70)
          END,
          descriptions[floor(random() * array_length(descriptions, 1) + 1)],
          'open'
        );
      END LOOP;
    END LOOP;
  END;
  
  RAISE NOTICE 'Created shifts for employers';
END $$;

-- =====================================================
-- CLEANUP
-- =====================================================

DROP FUNCTION IF EXISTS random_norwegian_name();
DROP FUNCTION IF EXISTS generate_simple_personal_number();

-- Re-add foreign key constraint (optional - comment out if you want to keep adding test data)
-- ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
--   FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
DECLARE
  worker_cnt INTEGER;
  employer_cnt INTEGER;
  availability_cnt INTEGER;
  shift_cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO worker_cnt FROM workers;
  SELECT COUNT(*) INTO employer_cnt FROM departments;
  SELECT COUNT(*) INTO availability_cnt FROM worker_availability;
  SELECT COUNT(*) INTO shift_cnt FROM shifts WHERE status = 'open';
  
  RAISE NOTICE '=== TEST DATA CREATED ===';
  RAISE NOTICE 'Workers: %', worker_cnt;
  RAISE NOTICE 'Employers: %', employer_cnt;
  RAISE NOTICE 'Worker Availability Slots: %', availability_cnt;
  RAISE NOTICE 'Open Shifts: %', shift_cnt;
  RAISE NOTICE '========================';
  RAISE NOTICE 'Note: These users do NOT have auth.users entries.';
  RAISE NOTICE 'To login, register new users through the site at /register';
END $$;