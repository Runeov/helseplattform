# Helseplattform Database Schema

PostgreSQL/Supabase database schema for the Norwegian health platform connecting municipalities with healthcare workers.

## Overview

This database supports:
- **1000+ healthcare workers** (nurses, healthcare assistants, doctors, social educators)
- **50+ municipal departments** (nursing homes, home care services, etc.)
- **Shift booking system** with applications and contracts
- **Rating system** for quality assurance
- **Direct messaging** between workers and departments

## Files

- **`schema.sql`** - Complete database schema with tables, indexes, RLS policies, and triggers
- **`seed.sql`** - Mock data generation script for testing and development
- **`README.md`** - This file

## Quick Start

### 1. Create the Schema

Run the schema file to create all tables, indexes, and security policies:

```bash
psql -U postgres -d your_database < schema.sql
```

Or in Supabase SQL Editor:
1. Open SQL Editor
2. Copy contents of `schema.sql`
3. Run the query

### 2. Seed with Mock Data

Generate test data (50 departments, 1000 workers, 200 shifts, 50 reviews):

```bash
psql -U postgres -d your_database < seed.sql
```

Or in Supabase SQL Editor:
1. Open SQL Editor
2. Copy contents of `seed.sql`
3. Run the query

## Database Schema

### Core Tables

#### 1. Users & Profiles

**`profiles`**
- Extends Supabase `auth.users`
- Stores common user data (name, email, role, avatar)
- Role: `'worker'` or `'employer'`

**`workers`**
- Healthcare worker specific data
- **HPR number** (Helsepersonellregister) - 7-9 digits, unique
- Profession: Sykepleier, Helsefagarbeider, Lege, Vernepleier
- Hourly rate, average rating, status

**`departments`**
- Municipal employer data
- Municipality name, department name
- **Cost center code** for invoicing
- Contact information

#### 2. Shift Management

**`shifts`**
- Work shifts posted by departments
- Start/end time with validation (end > start, minimum 2 hours)
- Status: `'open'`, `'assigned'`, `'completed'`, `'cancelled'`
- Profession required, hourly wage, description

**`shift_applications`**
- Workers apply for shifts
- Status: `'pending'`, `'approved'`, `'rejected'`, `'withdrawn'`
- One application per worker per shift (unique constraint)

**`contracts`**
- Approved applications become contracts
- One contract per shift (unique constraint)
- Status: `'active'`, `'completed'`, `'cancelled'`, `'archived'`
- PDF URL placeholder for future document storage

#### 3. Quality & Communication

**`reviews`**
- Employers rate workers after completed shifts
- Rating: 1-5 stars (validated)
- One review per shift per reviewer
- Automatically updates worker's average rating via trigger

**`direct_messages`**
- Chat between workers and departments
- Read/unread status
- Prevents self-messaging

## Security (Row Level Security)

All tables have RLS enabled with appropriate policies:

### Profiles
- ✅ Everyone can view all profiles
- ✅ Users can only update their own profile

### Workers & Departments
- ✅ Public read access (for discovery)
- ✅ Users can only update their own data

### Shifts
- ✅ Open shifts visible to everyone
- ✅ Departments can view/manage their own shifts
- ✅ Departments can create new shifts

### Applications
- ✅ Workers see their own applications
- ✅ Departments see applications for their shifts
- ✅ Workers can create/update own applications
- ✅ Departments can update applications for their shifts

### Contracts
- ✅ Visible to both worker and department
- ✅ Only departments can create/update contracts

### Reviews
- ✅ Public read access
- ✅ Only departments can create reviews

### Messages
- ✅ Only sender and receiver can view
- ✅ Only sender can create
- ✅ Only receiver can mark as read

## Indexes

Performance indexes on frequently queried columns:

- **Profiles**: role, email
- **Workers**: profession, status, HPR number, rating
- **Departments**: municipality, cost center
- **Shifts**: department, status, profession, start time, open future shifts
- **Applications**: shift, worker, status
- **Contracts**: shift, worker, status
- **Reviews**: reviewee, reviewer, shift, rating
- **Messages**: sender, receiver, unread, conversation

## Triggers

### Automatic Timestamp Updates
- `profiles`, `shifts`, `shift_applications`, `contracts` automatically update `updated_at` on modification

### Rating Calculation
- When a review is created, worker's `average_rating` and `total_reviews` are automatically updated

## Views

### `available_shifts`
- Shows all open shifts with department information
- Filtered for future shifts only
- Ordered by start time

### `worker_profiles`
- Complete worker profiles with ratings
- Joins profiles and workers tables
- Useful for worker discovery/search

## Norwegian Compliance

### HPR Number (Helsepersonellregister)
- Required for all healthcare workers
- 7-9 digit unique identifier
- Validates professional authorization
- Stored as TEXT with length validation

### Professions
Valid professions (Norwegian healthcare roles):
- **Sykepleier** (Nurse)
- **Helsefagarbeider** (Healthcare Assistant)
- **Lege** (Doctor)
- **Vernepleier** (Social Educator)

### Cost Center Codes
- Used for municipal accounting and invoicing
- Format: `MUNICIPALITY-XXXX` (e.g., `OSLO-0001`)
- Unique per department

## Mock Data

The seed script generates realistic Norwegian data:

### 50 Departments
- Real Norwegian municipality names (Oslo, Bergen, Trondheim, etc.)
- Various department types (nursing homes, home care, etc.)
- Unique cost center codes

### 1000 Workers
- Norwegian first and last names
- Valid HPR numbers (7 digits)
- Realistic professions and hourly rates:
  - Lege: 600-800 NOK/hour
  - Sykepleier: 400-550 NOK/hour
  - Vernepleier: 380-500 NOK/hour
  - Helsefagarbeider: 320-420 NOK/hour
- Status distribution: 70% available, 20% busy, 10% inactive

### 200 Shifts
- Mix of past, present, and future shifts
- Various durations (4, 8, or 12 hours)
- Realistic wage rates by profession
- Status distribution based on timing

### Applications & Contracts
- 1-5 applications per shift
- Approved applications automatically create contracts
- Realistic status progression

### 50 Reviews
- Weighted towards positive ratings (50% give 5 stars)
- Norwegian comments
- Automatically updates worker ratings

### 100 Direct Messages
- Realistic conversation starters
- 60% marked as read
- Between workers and departments

## Usage Examples

### Find Available Shifts for a Nurse in Oslo

```sql
SELECT * FROM available_shifts
WHERE profession_required = 'Sykepleier'
AND municipality_name = 'Oslo'
AND start_time > NOW()
ORDER BY start_time;
```

### Get Top-Rated Nurses

```sql
SELECT * FROM worker_profiles
WHERE profession = 'Sykepleier'
AND total_reviews >= 3
ORDER BY average_rating DESC, total_reviews DESC
LIMIT 10;
```

### Check Worker's Application History

```sql
SELECT 
  sa.*,
  s.start_time,
  s.end_time,
  d.municipality_name,
  d.department_name
FROM shift_applications sa
JOIN shifts s ON sa.shift_id = s.id
JOIN departments d ON s.department_id = d.id
WHERE sa.worker_id = 'worker-uuid-here'
ORDER BY sa.created_at DESC;
```

### Department's Upcoming Shifts

```sql
SELECT 
  s.*,
  COUNT(sa.id) as application_count
FROM shifts s
LEFT JOIN shift_applications sa ON s.id = sa.shift_id
WHERE s.department_id = 'department-uuid-here'
AND s.start_time > NOW()
GROUP BY s.id
ORDER BY s.start_time;
```

## Maintenance

### Reset Database

To completely reset and reseed:

```sql
-- Drop all tables (careful!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then run schema.sql and seed.sql again
```

### Clear Seed Data Only

```sql
-- Delete in correct order due to foreign keys
DELETE FROM direct_messages;
DELETE FROM reviews;
DELETE FROM contracts;
DELETE FROM shift_applications;
DELETE FROM shifts;
DELETE FROM workers;
DELETE FROM departments;
DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);
```

## Future Enhancements

Potential additions:
- [ ] Shift templates for recurring shifts
- [ ] Worker certifications and qualifications table
- [ ] Shift swap/trade functionality
- [ ] Notification preferences table
- [ ] Payment/invoice tracking
- [ ] Worker availability calendar
- [ ] Department team management
- [ ] Shift history and analytics
- [ ] Document storage integration (contracts, certificates)
- [ ] Multi-language support for UI strings

## Support

For questions or issues:
1. Check the SQL comments in `schema.sql`
2. Review RLS policies for access issues
3. Check indexes for performance issues
4. Verify foreign key constraints for data integrity

## License

Internal use only - Helseplattform project