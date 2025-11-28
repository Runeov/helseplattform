-- =====================================================
-- HELSEPLATTFORM SEED DATA
-- Mock data generation for testing and development
-- Generates: 50 departments, 1000 workers, 200 shifts, 50 reviews
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS FOR SEED DATA
-- =====================================================

-- Function to generate random Norwegian first names
CREATE OR REPLACE FUNCTION random_norwegian_first_name()
RETURNS TEXT AS $$
DECLARE
  names TEXT[] := ARRAY[
    'Ole', 'Kari', 'Per', 'Anne', 'Lars', 'Ingrid', 'Erik', 'Marit',
    'Hans', 'Liv', 'Bjørn', 'Solveig', 'Arne', 'Astrid', 'Svein', 'Grete',
    'Tor', 'Randi', 'Jan', 'Berit', 'Odd', 'Inger', 'Kjell', 'Sissel',
    'Geir', 'Tone', 'Terje', 'Hilde', 'Morten', 'Nina', 'Thomas', 'Lise',
    'Anders', 'Kristin', 'Martin', 'Heidi', 'Jonas', 'Maria', 'Henrik', 'Emma',
    'Magnus', 'Sofie', 'Kristian', 'Julie', 'Andreas', 'Ida', 'Daniel', 'Nora',
    'Fredrik', 'Sara', 'Alexander', 'Thea', 'Markus', 'Emilie', 'Tobias', 'Mia'
  ];
BEGIN
  RETURN names[floor(random() * array_length(names, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Function to generate random Norwegian last names
CREATE OR REPLACE FUNCTION random_norwegian_last_name()
RETURNS TEXT AS $$
DECLARE
  names TEXT[] := ARRAY[
    'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen',
    'Jensen', 'Karlsen', 'Johnsen', 'Pettersen', 'Eriksen', 'Berg', 'Haugen', 'Hagen',
    'Johannessen', 'Andreassen', 'Jacobsen', 'Dahl', 'Jørgensen', 'Henriksen', 'Lund', 'Halvorsen',
    'Sørensen', 'Nguyen', 'Bakke', 'Strand', 'Solberg', 'Moen', 'Lie', 'Martinsen',
    'Kristoffersen', 'Holm', 'Aas', 'Knudsen', 'Myhre', 'Knutsen', 'Amundsen', 'Berge'
  ];
BEGIN
  RETURN names[floor(random() * array_length(names, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Function to generate random Norwegian municipality names
CREATE OR REPLACE FUNCTION random_municipality()
RETURNS TEXT AS $$
DECLARE
  municipalities TEXT[] := ARRAY[
    'Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Bærum', 'Kristiansand', 'Fredrikstad',
    'Sandnes', 'Tromsø', 'Drammen', 'Asker', 'Lillestrøm', 'Skien', 'Ålesund', 'Sandefjord',
    'Haugesund', 'Tønsberg', 'Moss', 'Bodø', 'Arendal', 'Hamar', 'Larvik', 'Halden',
    'Askøy', 'Molde', 'Horten', 'Gjøvik', 'Harstad', 'Kongsberg', 'Jessheim', 'Porsgrunn',
    'Kristiansund', 'Elverum', 'Narvik', 'Lillehammer', 'Steinkjer', 'Mo i Rana', 'Grimstad',
    'Ski', 'Levanger', 'Ås', 'Kongsvinger', 'Mandal', 'Førde', 'Vennesla', 'Bryne',
    'Kopervik', 'Egersund', 'Verdal', 'Notodden'
  ];
BEGIN
  RETURN municipalities[floor(random() * array_length(municipalities, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Function to generate random department names
CREATE OR REPLACE FUNCTION random_department_name()
RETURNS TEXT AS $$
DECLARE
  departments TEXT[] := ARRAY[
    'Sykehjem avdeling 1', 'Sykehjem avdeling 2', 'Hjemmetjenesten', 'Akuttavdelingen',
    'Rehabilitering', 'Psykisk helse', 'Rus og avhengighet', 'Habiliteringstjenesten',
    'Dagsenter', 'Korttidsavdeling', 'Demensavdeling', 'Palliativ avdeling',
    'Omsorgsboliger', 'Aktivitetssenter', 'Eldresenter', 'Bofellesskap'
  ];
BEGIN
  RETURN departments[floor(random() * array_length(departments, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Function to generate random profession
CREATE OR REPLACE FUNCTION random_profession()
RETURNS TEXT AS $$
DECLARE
  professions TEXT[] := ARRAY['Sykepleier', 'Helsefagarbeider', 'Lege', 'Vernepleier'];
BEGIN
  RETURN professions[floor(random() * array_length(professions, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Function to generate random HPR number (7 digits)
CREATE OR REPLACE FUNCTION random_hpr_number()
RETURNS TEXT AS $$
BEGIN
  RETURN lpad(floor(random() * 10000000)::TEXT, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate valid Norwegian personal number (fødselsnummer)
-- Format: DDMMYYXXXCC where CC are control digits
CREATE OR REPLACE FUNCTION generate_personal_number(birth_year INTEGER, birth_month INTEGER, birth_day INTEGER)
RETURNS TEXT AS $$
DECLARE
  day_str TEXT;
  month_str TEXT;
  year_str TEXT;
  individual_num INTEGER;
  individual_str TEXT;
  partial TEXT;
  digits INTEGER[];
  k1 INTEGER;
  k2 INTEGER;
  k1_weights INTEGER[] := ARRAY[3,7,6,1,8,9,4,5,2];
  k2_weights INTEGER[] := ARRAY[5,4,3,2,7,6,5,4,3,2];
  sum INTEGER;
  idx INTEGER;
BEGIN
  -- Format date parts
  day_str := lpad(birth_day::TEXT, 2, '0');
  month_str := lpad(birth_month::TEXT, 2, '0');
  year_str := substring((birth_year % 100)::TEXT from '..$');
  
  -- Generate individual number (000-499 for 1900-1999)
  individual_num := floor(random() * 500);
  individual_str := lpad(individual_num::TEXT, 3, '0');
  
  -- Build partial number
  partial := day_str || month_str || year_str || individual_str;
  
  -- Convert to array of digits
  digits := ARRAY(SELECT substring(partial from pos for 1)::INTEGER FROM generate_series(1, 9) pos);
  
  -- Calculate K1 (first control digit)
  sum := 0;
  FOR idx IN 1..9 LOOP
    sum := sum + (digits[idx] * k1_weights[idx]);
  END LOOP;
  k1 := 11 - (sum % 11);
  IF k1 = 11 THEN k1 := 0; END IF;
  IF k1 = 10 THEN k1 := 0; END IF; -- Invalid but use 0 for mock
  
  -- Add K1 to digits array
  digits := digits || k1;
  
  -- Calculate K2 (second control digit)
  sum := 0;
  FOR idx IN 1..10 LOOP
    sum := sum + (digits[idx] * k2_weights[idx]);
  END LOOP;
  k2 := 11 - (sum % 11);
  IF k2 = 11 THEN k2 := 0; END IF;
  IF k2 = 10 THEN k2 := 0; END IF; -- Invalid but use 0 for mock
  
  RETURN partial || k1::TEXT || k2::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA: 50 DEPARTMENTS
-- =====================================================

DO $$
DECLARE
  dept_count INTEGER := 50;
  i INTEGER;
  user_id UUID;
  municipality TEXT;
  dept_name TEXT;
  cost_center TEXT;
BEGIN
  FOR i IN 1..dept_count LOOP
    -- Generate unique user ID
    user_id := uuid_generate_v4();
    municipality := random_municipality();
    dept_name := random_department_name();
    cost_center := municipality || '-' || lpad(i::TEXT, 4, '0');
    
    -- Insert into profiles with personal number and username
    INSERT INTO profiles (id, email, username, full_name, role, personal_number, created_at)
    VALUES (
      user_id,
      'dept' || i || '@' || lower(replace(municipality, ' ', '')) || '.kommune.no',
      'dept_' || lower(replace(municipality, ' ', '_')) || '_' || i,
      'Avdelingsleder ' || municipality,
      'employer',
      generate_personal_number(1960 + floor(random() * 40)::INTEGER, 1 + floor(random() * 12)::INTEGER, 1 + floor(random() * 28)::INTEGER),
      NOW() - (random() * INTERVAL '365 days')
    );
    
    -- Insert into departments
    INSERT INTO departments (id, municipality_name, department_name, cost_center_code, created_at)
    VALUES (
      user_id,
      municipality,
      dept_name,
      cost_center,
      NOW() - (random() * INTERVAL '365 days')
    );
  END LOOP;
  
  RAISE NOTICE 'Created % departments', dept_count;
END $$;

-- =====================================================
-- SEED DATA: 1000 WORKERS
-- =====================================================

DO $$
DECLARE
  worker_count INTEGER := 1000;
  i INTEGER;
  user_id UUID;
  first_name TEXT;
  last_name TEXT;
  full_name TEXT;
  profession TEXT;
  hpr TEXT;
  rate INTEGER;
BEGIN
  FOR i IN 1..worker_count LOOP
    -- Generate unique user ID and names
    user_id := uuid_generate_v4();
    first_name := random_norwegian_first_name();
    last_name := random_norwegian_last_name();
    full_name := first_name || ' ' || last_name;
    profession := random_profession();
    
    -- Generate unique HPR number
    LOOP
      hpr := random_hpr_number();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM workers WHERE hpr_number = hpr);
    END LOOP;
    
    -- Calculate hourly rate based on profession
    rate := CASE profession
      WHEN 'Lege' THEN 600 + floor(random() * 200)
      WHEN 'Sykepleier' THEN 400 + floor(random() * 150)
      WHEN 'Vernepleier' THEN 380 + floor(random() * 120)
      WHEN 'Helsefagarbeider' THEN 320 + floor(random() * 100)
    END;
    
    -- Insert into profiles with personal number and username
    INSERT INTO profiles (id, email, username, full_name, role, personal_number, created_at)
    VALUES (
      user_id,
      lower(first_name) || '.' || lower(last_name) || i || '@helsepersonell.no',
      lower(first_name) || '_' || lower(last_name) || '_' || i,
      full_name,
      'worker',
      generate_personal_number(1970 + floor(random() * 35)::INTEGER, 1 + floor(random() * 12)::INTEGER, 1 + floor(random() * 28)::INTEGER),
      NOW() - (random() * INTERVAL '365 days')
    );
    
    -- Insert into workers
    INSERT INTO workers (
      id, 
      hpr_number, 
      profession, 
      hourly_rate, 
      status,
      bio,
      created_at
    )
    VALUES (
      user_id,
      hpr,
      profession,
      rate,
      CASE 
        WHEN random() < 0.7 THEN 'available'
        WHEN random() < 0.9 THEN 'busy'
        ELSE 'inactive'
      END,
      'Erfaren ' || lower(profession) || ' med ' || (5 + floor(random() * 20))::TEXT || ' års erfaring.',
      NOW() - (random() * INTERVAL '365 days')
    );
  END LOOP;
  
  RAISE NOTICE 'Created % workers', worker_count;
END $$;

-- =====================================================
-- SEED DATA: 200 SHIFTS
-- =====================================================

DO $$
DECLARE
  shift_count INTEGER := 200;
  i INTEGER;
  dept_id UUID;
  profession TEXT;
  start_time TIMESTAMPTZ;
  duration INTEGER;
  wage INTEGER;
  shift_status TEXT;
BEGIN
  FOR i IN 1..shift_count LOOP
    -- Select random department
    SELECT id INTO dept_id FROM departments ORDER BY random() LIMIT 1;
    
    -- Random profession
    profession := random_profession();
    
    -- Random start time (mix of past, present, and future)
    start_time := CASE 
      WHEN random() < 0.3 THEN NOW() - (random() * INTERVAL '30 days')  -- Past shifts
      WHEN random() < 0.5 THEN NOW() + (random() * INTERVAL '2 days')   -- Near future
      ELSE NOW() + (random() * INTERVAL '60 days')                       -- Future shifts
    END;
    
    -- Random duration (4, 8, or 12 hours)
    duration := (ARRAY[4, 8, 12])[floor(random() * 3 + 1)];
    
    -- Calculate wage based on profession
    wage := CASE profession
      WHEN 'Lege' THEN 650 + floor(random() * 150)
      WHEN 'Sykepleier' THEN 450 + floor(random() * 100)
      WHEN 'Vernepleier' THEN 400 + floor(random() * 80)
      WHEN 'Helsefagarbeider' THEN 350 + floor(random() * 70)
    END;
    
    -- Determine status based on start time
    shift_status := CASE
      WHEN start_time < NOW() - INTERVAL '1 day' THEN 'completed'
      WHEN start_time < NOW() THEN 
        CASE WHEN random() < 0.7 THEN 'assigned' ELSE 'completed' END
      ELSE
        CASE WHEN random() < 0.6 THEN 'open' ELSE 'assigned' END
    END;
    
    -- Insert shift
    INSERT INTO shifts (
      department_id,
      start_time,
      end_time,
      status,
      profession_required,
      description,
      hourly_wage,
      created_at
    )
    VALUES (
      dept_id,
      start_time,
      start_time + (duration || ' hours')::INTERVAL,
      shift_status,
      profession,
      'Vakt på ' || random_department_name() || '. ' || 
      CASE 
        WHEN random() < 0.5 THEN 'Erfaring med eldre pasienter ønskes.'
        ELSE 'Gode norskkunnskaper er viktig.'
      END,
      wage,
      start_time - INTERVAL '7 days'
    );
  END LOOP;
  
  RAISE NOTICE 'Created % shifts', shift_count;
END $$;

-- =====================================================
-- SEED DATA: SHIFT APPLICATIONS
-- =====================================================

DO $$
DECLARE
  shift_record RECORD;
  worker_id UUID;
  app_count INTEGER;
BEGIN
  -- For each open or assigned shift, create 1-5 applications
  FOR shift_record IN 
    SELECT id, profession_required, status 
    FROM shifts 
    WHERE status IN ('open', 'assigned')
  LOOP
    app_count := 1 + floor(random() * 4);
    
    FOR i IN 1..app_count LOOP
      -- Find a random worker with matching profession
      SELECT w.id INTO worker_id
      FROM workers w
      WHERE w.profession = shift_record.profession_required
      AND NOT EXISTS (
        SELECT 1 FROM shift_applications sa 
        WHERE sa.shift_id = shift_record.id AND sa.worker_id = w.id
      )
      ORDER BY random()
      LIMIT 1;
      
      IF worker_id IS NOT NULL THEN
        INSERT INTO shift_applications (
          shift_id,
          worker_id,
          status,
          message,
          created_at
        )
        VALUES (
          shift_record.id,
          worker_id,
          CASE 
            WHEN shift_record.status = 'assigned' AND i = 1 THEN 'approved'
            WHEN random() < 0.2 THEN 'rejected'
            ELSE 'pending'
          END,
          'Jeg er interessert i denne vakten og har relevant erfaring.',
          NOW() - (random() * INTERVAL '14 days')
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created shift applications';
END $$;

-- =====================================================
-- SEED DATA: CONTRACTS
-- =====================================================

DO $$
DECLARE
  app_record RECORD;
BEGIN
  -- Create contracts for approved applications
  FOR app_record IN 
    SELECT sa.shift_id, sa.worker_id, sa.created_at
    FROM shift_applications sa
    JOIN shifts s ON sa.shift_id = s.id
    WHERE sa.status = 'approved'
  LOOP
    INSERT INTO contracts (
      shift_id,
      worker_id,
      signed_at,
      status,
      created_at
    )
    VALUES (
      app_record.shift_id,
      app_record.worker_id,
      app_record.created_at + INTERVAL '1 day',
      CASE 
        WHEN (SELECT start_time FROM shifts WHERE id = app_record.shift_id) < NOW() 
        THEN 'completed'
        ELSE 'active'
      END,
      app_record.created_at + INTERVAL '1 day'
    );
  END LOOP;
  
  RAISE NOTICE 'Created contracts for approved applications';
END $$;

-- =====================================================
-- SEED DATA: 50 REVIEWS
-- =====================================================

DO $$
DECLARE
  review_count INTEGER := 50;
  i INTEGER;
  contract_record RECORD;
  dept_id UUID;
  rating INTEGER;
BEGIN
  FOR i IN 1..review_count LOOP
    -- Select a random completed contract
    SELECT c.shift_id, c.worker_id, s.department_id
    INTO contract_record
    FROM contracts c
    JOIN shifts s ON c.shift_id = s.id
    WHERE c.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM reviews r WHERE r.shift_id = c.shift_id
    )
    ORDER BY random()
    LIMIT 1;
    
    IF contract_record.shift_id IS NOT NULL THEN
      -- Generate rating (weighted towards higher ratings)
      rating := CASE 
        WHEN random() < 0.5 THEN 5
        WHEN random() < 0.8 THEN 4
        WHEN random() < 0.95 THEN 3
        ELSE 2
      END;
      
      INSERT INTO reviews (
        reviewer_id,
        reviewee_id,
        shift_id,
        rating,
        comment,
        created_at
      )
      VALUES (
        contract_record.department_id,
        contract_record.worker_id,
        contract_record.shift_id,
        rating,
        CASE rating
          WHEN 5 THEN 'Utmerket arbeid! Punktlig og profesjonell.'
          WHEN 4 THEN 'Veldig bra. Kommer gjerne tilbake.'
          WHEN 3 THEN 'Greit arbeid, men rom for forbedring.'
          ELSE 'Ikke helt som forventet.'
        END,
        NOW() - (random() * INTERVAL '60 days')
      );
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Created % reviews', review_count;
END $$;

-- =====================================================
-- SEED DATA: SAMPLE DIRECT MESSAGES
-- =====================================================

DO $$
DECLARE
  message_count INTEGER := 100;
  i INTEGER;
  sender_id UUID;
  receiver_id UUID;
  messages TEXT[] := ARRAY[
    'Hei! Jeg ser du har søkt på vakten. Har du erfaring med demens?',
    'Takk for søknaden. Vi vil gjerne invitere deg til et kort intervju.',
    'Hei! Når kan du starte?',
    'Jeg har noen spørsmål om vakten. Kan du ringe meg?',
    'Takk for en flott innsats i går!',
    'Kan du ta en ekstravakt på fredag?',
    'Hei! Er det mulig å bytte vakt?',
    'Jeg må dessverre avlyse vakten i morgen. Beklager!',
    'Flott! Vi ser frem til å ha deg hos oss.',
    'Kan du sende over referanser?'
  ];
BEGIN
  FOR i IN 1..message_count LOOP
    -- Select random sender (mix of workers and departments)
    SELECT id INTO sender_id FROM profiles ORDER BY random() LIMIT 1;
    
    -- Select random receiver (different from sender, opposite role preferred)
    SELECT id INTO receiver_id 
    FROM profiles 
    WHERE id != sender_id 
    AND role != (SELECT role FROM profiles WHERE id = sender_id)
    ORDER BY random() 
    LIMIT 1;
    
    IF sender_id IS NOT NULL AND receiver_id IS NOT NULL THEN
      INSERT INTO direct_messages (
        sender_id,
        receiver_id,
        content,
        is_read,
        created_at
      )
      VALUES (
        sender_id,
        receiver_id,
        messages[floor(random() * array_length(messages, 1) + 1)],
        random() < 0.6,  -- 60% are read
        NOW() - (random() * INTERVAL '30 days')
      );
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Created % direct messages', message_count;
END $$;

-- =====================================================
-- CLEANUP HELPER FUNCTIONS
-- =====================================================

-- Drop the helper functions after seeding
DROP FUNCTION IF EXISTS random_norwegian_first_name();
DROP FUNCTION IF EXISTS random_norwegian_last_name();
DROP FUNCTION IF EXISTS random_municipality();
DROP FUNCTION IF EXISTS random_department_name();
DROP FUNCTION IF EXISTS random_profession();
DROP FUNCTION IF EXISTS random_hpr_number();
DROP FUNCTION IF EXISTS generate_personal_number(INTEGER, INTEGER, INTEGER);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show summary of seeded data
DO $$
BEGIN
  RAISE NOTICE '=== SEED DATA SUMMARY ===';
  RAISE NOTICE 'Profiles: %', (SELECT COUNT(*) FROM profiles);
  RAISE NOTICE 'Workers: %', (SELECT COUNT(*) FROM workers);
  RAISE NOTICE 'Departments: %', (SELECT COUNT(*) FROM departments);
  RAISE NOTICE 'Shifts: %', (SELECT COUNT(*) FROM shifts);
  RAISE NOTICE '  - Open: %', (SELECT COUNT(*) FROM shifts WHERE status = 'open');
  RAISE NOTICE '  - Assigned: %', (SELECT COUNT(*) FROM shifts WHERE status = 'assigned');
  RAISE NOTICE '  - Completed: %', (SELECT COUNT(*) FROM shifts WHERE status = 'completed');
  RAISE NOTICE 'Applications: %', (SELECT COUNT(*) FROM shift_applications);
  RAISE NOTICE 'Contracts: %', (SELECT COUNT(*) FROM contracts);
  RAISE NOTICE 'Reviews: %', (SELECT COUNT(*) FROM reviews);
  RAISE NOTICE 'Messages: %', (SELECT COUNT(*) FROM direct_messages);
  RAISE NOTICE '========================';
END $$;