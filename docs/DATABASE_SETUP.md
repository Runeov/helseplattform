# Complete Database Setup Guide

Step-by-step guide to set up the Helseplattform database with all features including notifications and real-time updates.

## Overview

The database consists of:
1. **Core schema** - Users, workers, departments, shifts, applications, contracts
2. **Notifications schema** - Notification preferences, queue, worker matching
3. **Worker availability schema** - Time slots when workers are available
4. **Test users** - USER1 (worker) and USER2 (employer) for testing

## Prerequisites

- PostgreSQL 14+ or Supabase project
- psql command-line tool (for local PostgreSQL)
- Supabase account (for cloud deployment)

## Option 1: Local PostgreSQL Setup

### Step 1: Create Database

```bash
createdb helseplattform
```

### Step 2: Run Schemas in Order

```bash
# 1. Main schema (users, shifts, applications, etc.)
psql -d helseplattform -f database/schema.sql

# 2. Notifications schema (notification system)
psql -d helseplattform -f database/notifications_schema.sql

# 3. Worker availability schema
psql -d helseplattform -f database/worker_availability_schema.sql

# 4. Seed data (1050 users)
psql -d helseplattform -f database/seed.sql

# 5. Test users (USER1 and USER2)
psql -d helseplattform -f database/test_users.sql
```

### Step 3: Verify Installation

```sql
-- Check tables
\dt

-- Check data
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM workers;
SELECT COUNT(*) FROM departments;
SELECT COUNT(*) FROM shifts;

-- Verify test users
SELECT username, full_name, role FROM profiles WHERE username IN ('user1', 'user2');
```

## Option 2: Supabase Cloud Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and region (Europe for Norwegian users)
4. Set database password
5. Wait for project to be ready

### Step 2: Run SQL in Supabase SQL Editor

1. Open your project
2. Go to SQL Editor
3. Create a new query
4. Copy and paste each schema file in order:
   - `database/schema.sql`
   - `database/notifications_schema.sql`
   - `database/worker_availability_schema.sql`
   - `database/seed.sql`
   - `database/test_users.sql`
5. Run each query

### Step 3: Enable Realtime

1. Go to Database > Replication
2. Enable replication for these tables:
   - `shifts`
   - `shift_applications`
   - `notification_queue`
   - `direct_messages`

### Step 4: Configure Environment Variables

Create `.env` file:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these from: Project Settings > API

## Database Schema Overview

### Core Tables

**profiles** - All users (workers and employers)
- Links to Supabase auth.users
- Contains username, full_name, personal_number
- ID-porten integration fields

**workers** - Healthcare workers
- HPR number, profession, hourly rate
- Average rating and review count
- Status (available/busy/inactive)

**departments** - Municipal employers
- Municipality, department name
- Cost center for invoicing

**shifts** - Work shifts
- Posted by departments
- Status: open/assigned/completed/cancelled
- Time validation (end > start, minimum 2 hours)

**shift_applications** - Worker applications
- Status: pending/approved/rejected
- One application per worker per shift

**contracts** - Approved applications
- One contract per shift
- Status tracking

**reviews** - Employer ratings of workers
- 1-5 stars
- Automatically updates worker average_rating

**direct_messages** - Chat between users

### Notification Tables

**notification_preferences** - User notification settings
- Email, SMS, push preferences
- Quiet hours
- Channel-specific settings

**notification_queue** - Notifications to send
- Type: email/SMS/push
- Status: pending/sent/failed
- Provider tracking

**worker_locations** - Worker location preferences
- Municipality preferences
- Maximum distance

**shift_notifications** - Tracking
- Which workers were notified
- When they viewed/responded

### Availability Tables

**worker_availability** - Worker time slots
- Start/end time
- Recurring patterns
- Preferred shift types

## Key Features

### 1. Automatic Worker Matching

When a shift is created, the database automatically:
1. Finds workers with matching profession
2. Checks availability status
3. Scores based on wage, rating, experience
4. Creates notification queue entries
5. Tracks who was notified

### 2. Real-Time Updates

Supabase Realtime enables:
- Instant shift notifications
- Live application updates
- Real-time chat messages
- Dashboard auto-refresh

### 3. Notification System

Multi-channel notifications:
- **Email**: Detailed shift information
- **SMS**: Brief alerts for urgent shifts
- **Push**: Instant in-app notifications

### 4. Row Level Security

All tables have RLS policies:
- Users can only edit their own data
- Departments manage their own shifts
- Workers see their own applications
- Messages only visible to sender/receiver

## Test Users

### USER1 - Healthcare Worker
```
Email: user1@test.no
Password: USER1
Role: Worker (Sykepleier)
HPR: 1234567
```

### USER2 - Department Manager
```
Email: user2@test.no
Password: USER2
Role: Employer (Avdelingsleder)
Municipality: Gran kommune
Department: Sykehjemmet avd. 2
```

## Common Queries

### Find Available Shifts

```sql
SELECT * FROM available_shifts
WHERE profession_required = 'Sykepleier'
ORDER BY start_time;
```

### Get Eligible Workers for Shift

```sql
SELECT * FROM get_eligible_workers('shift-uuid');
```

### Check Notification Status

```sql
SELECT 
  type,
  status,
  COUNT(*) as count
FROM notification_queue
GROUP BY type, status;
```

### Worker's Upcoming Availability

```sql
SELECT * FROM get_worker_upcoming_availability('worker-uuid');
```

## Maintenance

### Reset Database

```sql
-- Drop all tables (careful!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Then run all schema files again
```

### Clear Test Data

```sql
DELETE FROM shift_notifications;
DELETE FROM notification_queue;
DELETE FROM worker_availability;
DELETE FROM direct_messages;
DELETE FROM reviews;
DELETE FROM contracts;
DELETE FROM shift_applications;
DELETE FROM shifts;
DELETE FROM worker_locations;
DELETE FROM workers;
DELETE FROM departments;
DELETE FROM notification_preferences;
DELETE FROM profiles WHERE username NOT IN ('user1', 'user2');
```

### Backup Database

```bash
# Local PostgreSQL
pg_dump helseplattform > backup.sql

# Supabase (via dashboard)
# Go to Database > Backups
```

## Performance Tips

1. **Indexes**: All critical columns are indexed
2. **Views**: Use materialized views for complex queries
3. **Pagination**: Limit results to 50-100 per page
4. **Caching**: Cache frequently accessed data
5. **Connection pooling**: Use Supabase's built-in pooling

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] Policies tested for each role
- [ ] Personal numbers encrypted
- [ ] API keys in environment variables
- [ ] HTTPS only in production
- [ ] Regular security audits

## Troubleshooting

### Can't connect to database
- Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Verify project is not paused (Supabase free tier)

### RLS blocking queries
- Check policies with: `SELECT * FROM pg_policies;`
- Test with service role key (bypasses RLS)

### Slow queries
- Check indexes: `SELECT * FROM pg_indexes WHERE tablename = 'shifts';`
- Use EXPLAIN ANALYZE for query plans

### Notifications not sending
- Check notification_queue for failed entries
- Verify Edge Function is deployed
- Check third-party service credentials

## Next Steps

1. Run all schema files
2. Verify test users exist
3. Test login with USER1 and USER2
4. Create a shift as USER2
5. Check notification_queue
6. Deploy Edge Functions (see NOTIFICATIONS_SETUP.md)
7. Configure third-party services

## Support

- PostgreSQL Docs: https://www.postgresql.org/docs/
- Supabase Docs: https://supabase.com/docs
- SQL Tutorial: https://www.postgresqltutorial.com/