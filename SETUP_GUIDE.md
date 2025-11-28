# Helseplattform - Complete Setup Guide

Step-by-step guide to get your Helseplattform running with a real Supabase database.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create account
3. Click "New Project"
4. Fill in:
   - **Name**: helseplattform
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Europe (closest to Norway)
5. Click "Create new project"
6. Wait 2-3 minutes for project to be ready

## Step 2: Run Database Schemas

1. In your Supabase project, go to **SQL Editor**
2. Click "New Query"
3. Run each schema file in this exact order:

### 2.1 Main Schema
- Copy entire contents of `database/schema.sql`
- Paste into SQL Editor
- Click "Run" or press Ctrl+Enter
- Wait for "Success" message

### 2.2 Notifications Schema
- Copy entire contents of `database/notifications_schema.sql`
- Paste into SQL Editor
- Click "Run"
- Wait for "Success"

### 2.3 Worker Availability Schema
- Copy entire contents of `database/worker_availability_schema.sql`
- Paste into SQL Editor
- Click "Run"
- Wait for "Success"

### 2.4 Seed Data (Optional - for testing)
- Copy entire contents of `database/seed.sql`
- Paste into SQL Editor
- Click "Run"
- This creates 1050 test users (takes ~30 seconds)

### 2.5 Test Users
- Copy entire contents of `database/test_users.sql`
- Paste into SQL Editor
- Click "Run"
- Creates USER1 and USER2 for testing

## Step 3: Get Your Credentials

1. In Supabase, go to **Project Settings** (gear icon)
2. Click **API** in the left sidebar
3. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)

## Step 4: Configure Your App

1. In your project root, create a file named `.env`:

```bash
# In the helseplattform-skeleton folder
touch .env
```

2. Add your Supabase credentials to `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ID-porten (optional - for production)
VITE_IDPORTEN_CLIENT_ID=
VITE_IDPORTEN_CLIENT_SECRET=
VITE_IDPORTEN_REDIRECT_URI=http://localhost:3001/auth/callback
```

**IMPORTANT**: Replace the values with YOUR actual credentials from Step 3!

## Step 5: Restart Dev Server

1. Stop the current dev server (Ctrl+C in terminal)
2. Start it again:

```bash
npm run dev
```

3. The app will now connect to your Supabase database!

## Step 6: Test the Connection

### Test Login
1. Go to http://localhost:3001/login
2. Login with:
   - Email: `user1@test.no`
   - Password: `USER1`
3. You should see `@user1` with 👨‍⚕️ icon in the navbar

### Test Dashboard
1. Login as USER2:
   - Email: `user2@test.no`
   - Password: `USER2`
2. Go to Dashboard
3. You should see real data from database
4. Try clicking different tabs

### Test Create Shift
1. While logged in as USER2
2. Click "+ Opprett ny vakt"
3. Fill out the form
4. Select a profession
5. You should see **eligible workers** list appear
6. Click "Publiser vakt"
7. Shift is saved to database!

## Step 7: Enable Realtime (Optional)

For live updates:

1. In Supabase, go to **Database** > **Replication**
2. Enable replication for these tables:
   - `shifts`
   - `shift_applications`
   - `notification_queue`
3. Save changes

Now the dashboard will update in real-time when data changes!

## Troubleshooting

### "Supabase credentials not configured"
- Check that `.env` file exists in project root
- Verify variable names start with `VITE_`
- Restart dev server after adding `.env`

### "Failed to fetch"
- Check Supabase project is not paused
- Verify URL and key are correct
- Check browser console for errors

### "RLS policy violation"
- Run `database/schema.sql` again
- Check RLS policies in Supabase Dashboard > Authentication > Policies

### No data showing
- Run `database/seed.sql` to create test data
- Run `database/test_users.sql` to create USER1 and USER2
- Check tables have data: Go to Supabase > Table Editor

## What You Get

✅ **Real database** with 1050+ users
✅ **USER1** (worker) and **USER2** (employer) test accounts
✅ **Live dashboard** with real data
✅ **Create shifts** that save to database
✅ **Eligible workers** list with real-time updates
✅ **Notifications** (when Edge Functions deployed)
✅ **Worker availability** posting
✅ **Applications** and approvals

## Next Steps

1. Follow steps 1-6 above
2. Test with USER1 and USER2
3. Create some shifts
4. Post worker availability
5. See real-time updates!

For notification setup (email/SMS/push), see `docs/NOTIFICATIONS_SETUP.md`