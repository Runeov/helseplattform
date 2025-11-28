# Connect Site to Supabase - Simplest Method

Start with an empty database and add users through the registration page.

## Step 1: Run Database Schemas Only

In Supabase SQL Editor, run these 3 schemas (in order):

1. **Main Schema**: Copy/paste [`database/schema.sql`](database/schema.sql:1) → Run
2. **Notifications**: Copy/paste [`database/notifications_schema.sql`](database/notifications_schema.sql:1) → Run  
3. **Availability**: Copy/paste [`database/worker_availability_schema.sql`](database/worker_availability_schema.sql:1) → Run

**Skip test_users.sql and seed.sql** - Database is now empty and ready!

## Step 2: Get Supabase Credentials

1. Supabase Dashboard → **Project Settings** (gear icon) → **API**
2. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGc...` (long key)

## Step 3: Create .env File

In your project root (`helseplattform-skeleton/`), create `.env`:

```env
VITE_SUPABASE_URL=https://your-actual-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key
```

**Replace with YOUR actual values from Step 2!**

## Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C in terminal)
npm run dev
```

## Step 5: Register Users Through the Site

### Register First User (Worker)
1. Go to http://localhost:3001/register
2. Click "Registrer med ID-porten" (uses mock in dev mode)
3. Choose "Helsepersonell"
4. Fill out:
   - Brukernavn: `testworker`
   - HPR-nummer: `1234567`
   - Yrkeskategori: Sykepleier
   - Timepris: `450`
5. Click "Opprett profil"
6. **User is created in Supabase!**

### Register Second User (Employer)
1. Go to /register again
2. Click "Registrer med ID-porten"
3. Choose "Kommune-representant"
4. Fill out:
   - Brukernavn: `testboss`
   - Kommune: Gran kommune
   - Avdeling: Sykehjemmet
   - Kostnadssted: GRAN-001
   - Rolle: Avdelingsleder
5. Click "Opprett profil"
6. **Employer created in Supabase!**

## Step 6: Test Creating a Shift

1. Login as employer (if not already)
2. Go to Dashboard
3. Click "+ Opprett ny vakt"
4. Fill out shift details
5. Select profession (e.g., Sykepleier)
6. You'll see eligible workers list (should show your worker!)
7. Click "Publiser vakt"
8. **Shift saved to database!**

## Verify in Supabase

1. Go to Supabase → **Table Editor**
2. Check tables:
   - `profiles` - Should have 2 users
   - `workers` - Should have 1 worker
   - `departments` - Should have 1 department
   - `shifts` - Should have your created shift

## That's It!

Your site is now fully connected to Supabase. Everything you create through the site is saved to the real database.

## Troubleshooting

### "Supabase credentials not configured"
- Check `.env` file exists
- Verify it's in project root (same folder as package.json)
- Variable names must start with `VITE_`
- Restart dev server after creating `.env`

### Registration doesn't save to database
- Check browser console for errors
- Verify Supabase URL and key are correct
- Check RLS policies are enabled (they are in schema.sql)

### Can't see created data
- Go to Supabase Table Editor
- Select the table (profiles, shifts, etc.)
- Click "Refresh" if needed

## Next Steps

- Register more workers
- Post worker availability
- Create shifts
- Test applications
- See real-time matching!