# Quick Start - Connect to Supabase

Minimal setup to get your site connected to Supabase database.

## Step 1: Run Only Required Schemas

In Supabase SQL Editor, run these 4 schemas in order:

### 1. Main Schema
Copy/paste entire contents of [`database/schema.sql`](database/schema.sql:1) and run.

### 2. Notifications Schema
Copy/paste entire contents of [`database/notifications_schema.sql`](database/notifications_schema.sql:1) and run.

### 3. Worker Availability Schema
Copy/paste entire contents of [`database/worker_availability_schema.sql`](database/worker_availability_schema.sql:1) and run.

### 4. Test Users Only
Copy/paste entire contents of [`database/test_users.sql`](database/test_users.sql:1) and run.

This creates:
- All tables and relationships
- USER1 (worker) and USER2 (employer)
- NO seed data (you'll add manually)

## Step 2: Get Supabase Credentials

1. In Supabase Dashboard, go to **Project Settings** (gear icon)
2. Click **API**
3. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)

## Step 3: Configure Your App

Create `.env` file in project root (`helseplattform-skeleton/.env`):

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Replace with YOUR actual values!**

## Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## Step 5: Test the Connection

### Login
1. Go to http://localhost:3001/login
2. Login with:
   - Email: `user2@test.no`
   - Password: `USER2`
3. You should see `@user2` with 🏛️ icon in navbar

### Create Your First Shift
1. Click "+ Opprett ny vakt"
2. Fill out:
   - Yrkeskategori: Sykepleier
   - Dato: Tomorrow's date
   - Starttid: 08:00
   - Sluttid: 16:00
   - Timelønn: 450
3. You'll see "Tilgjengelige arbeidstakere (0)" (no workers yet)
4. Click "Publiser vakt"
5. **Shift is saved to database!**

### Verify in Supabase
1. Go to Supabase > Table Editor
2. Click `shifts` table
3. You should see your shift!

### Add a Worker Manually
1. Logout (click "Logg ut")
2. Login as USER1:
   - Email: `user1@test.no`
   - Password: `USER1`
3. Go to Profile
4. Click "+ Registrer tilgjengelighet"
5. Set your available times
6. Save

### Create Another Shift
1. Logout and login as USER2 again
2. Create another shift
3. Now you'll see USER1 in "Tilgjengelige arbeidstakere" list!

## What Works Now

✅ **Real database** connection
✅ **Login** with USER1/USER2
✅ **Create shifts** - saves to database
✅ **Eligible workers** - fetched from database
✅ **Dashboard tabs** - show real data
✅ **Worker availability** - saves to database
✅ **Applications** - can be approved/rejected
✅ **Header** shows logged-in user with icon

## Troubleshooting

### "Supabase credentials not configured"
- Check `.env` file exists in project root
- Verify variables start with `VITE_`
- Restart dev server

### "Failed to fetch"
- Check Supabase project URL is correct
- Verify anon key is correct
- Check project isn't paused

### No eligible workers showing
- Make sure you've added worker availability
- Check worker status is 'available'
- Verify profession matches

## Next Steps

1. Add more workers through registration
2. Post worker availability
3. Create shifts and see matching
4. Test applications and approvals
5. Later: Deploy notification Edge Functions

You're now connected to a real database!