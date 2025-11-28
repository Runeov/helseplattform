# Adding Test Users to Supabase Database

This guide explains how to add the test users (user1@test.no and user2@test.no) to your Supabase database.

## Prerequisites

- Access to your Supabase project dashboard
- Database connection configured in your `.env` file

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Create Auth Users

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** > **Users**
4. Click **Add User** (or **Invite User**)

#### Create User 1 (Worker)
- **Email**: `user1@test.no`
- **Password**: Leave empty or set a temporary password (not needed for email-only login)
- **Auto Confirm User**: ✅ Check this box
- Click **Create User**

#### Create User 2 (Employer)
- **Email**: `user2@test.no`
- **Password**: Leave empty or set a temporary password (not needed for email-only login)
- **Auto Confirm User**: ✅ Check this box
- Click **Create User**

### Step 2: Run the SQL Script

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `database/add_test_users.sql`
4. Paste into the SQL editor
5. Click **Run** or press `Ctrl+Enter`

The script will:
- Find the auth.users IDs for both email addresses
- Create profiles for both users
- Create worker details for user1
- Create department details for user2
- Display a verification query showing the created users

### Step 3: Verify

You should see output like:
```
| id                                   | username | full_name        | email           | role     | details              |
|--------------------------------------|----------|------------------|-----------------|----------|----------------------|
| <uuid>                               | user1    | Thomas Testbruker| user1@test.no   | worker   | Sykepleier          |
| <uuid>                               | user2    | Anne Testleder   | user2@test.no   | employer | Sykehjemmet avd. 2  |
```

## Method 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push

# Or execute the SQL file directly
supabase db execute -f database/add_test_users.sql
```

## Method 3: Using psql (Direct Database Connection)

If you have direct database access:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f database/add_test_users.sql
```

## Test the Users

After adding the users, test the login:

1. Go to your application's login page
2. Enter `user1@test.no` (for worker) or `user2@test.no` (for employer)
3. Click login
4. You should be redirected to the appropriate dashboard

### User Details

**USER1 - Healthcare Worker**
- Email: `user1@test.no`
- Name: Thomas Testbruker
- Role: Worker (Sykepleier/Nurse)
- HPR Number: 1234567
- Hourly Rate: 450 NOK
- Status: Available

**USER2 - Department Manager**
- Email: `user2@test.no`
- Name: Anne Testleder
- Role: Employer
- Department: Sykehjemmet avd. 2
- Municipality: Gran kommune
- Cost Center: GRAN-TEST-001

## Troubleshooting

### Error: "User not found in auth.users"

This means you need to create the auth users first in the Supabase Dashboard (Step 1).

### Error: "duplicate key value violates unique constraint"

The users already exist. You can either:
- Delete them from the database and start over
- The script uses `ON CONFLICT DO UPDATE`, so it should update existing records

### Users created but can't log in

Make sure:
1. The users are confirmed in Supabase Dashboard (Authentication > Users)
2. Your `.env` file has the correct Supabase credentials
3. The email addresses match exactly (case-sensitive)

## Removing Test Users

To remove the test users:

```sql
-- Delete from role-specific tables first
DELETE FROM workers WHERE id IN (
  SELECT id FROM profiles WHERE email IN ('user1@test.no', 'user2@test.no')
);

DELETE FROM departments WHERE id IN (
  SELECT id FROM profiles WHERE email IN ('user1@test.no', 'user2@test.no')
);

-- Delete profiles
DELETE FROM profiles WHERE email IN ('user1@test.no', 'user2@test.no');

-- Delete from auth.users (in Supabase Dashboard or via API)
```

## Next Steps

After adding the test users:
1. Test the login flow with both users
2. Test creating shifts as user2 (employer)
3. Test viewing and applying for shifts as user1 (worker)
4. Verify the database queries are working correctly