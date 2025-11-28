# Notification System Setup Guide

Complete guide for setting up the real-time notification system with Supabase, including email, SMS, and push notifications.

## Overview

When an employer posts a new shift, the system automatically:
1. **Matches eligible workers** based on profession, location, availability, and rating
2. **Sends instant notifications** via email, SMS, and/or push notifications
3. **Tracks delivery status** and worker responses
4. **Shows eligible workers** to employers when creating shifts

## Architecture

```
Shift Created
    ↓
Database Trigger (notify_eligible_workers_on_shift_create)
    ↓
Find Eligible Workers (get_eligible_workers function)
    ↓
Create Notification Queue Entries
    ↓
Supabase Edge Function (send-notifications)
    ↓
Send via: SendGrid (email) | Twilio (SMS) | OneSignal (push)
    ↓
Update Delivery Status
```

## Prerequisites

### 1. Supabase Project
- Create a project at [supabase.com](https://supabase.com)
- Note your project URL and service role key

### 2. Third-Party Services

**Email - SendGrid** (Recommended)
- Sign up at [sendgrid.com](https://sendgrid.com)
- Create API key with "Mail Send" permissions
- Verify sender email/domain

**SMS - Twilio**
- Sign up at [twilio.com](https://twilio.com)
- Get Account SID and Auth Token
- Purchase a Norwegian phone number (+47)

**Push Notifications - OneSignal**
- Sign up at [onesignal.com](https://onesignal.com)
- Create a new app
- Get App ID and REST API Key

## Database Setup

### Step 1: Run Main Schema

```bash
psql -U postgres -d your_database < database/schema.sql
```

### Step 2: Run Notifications Schema

```bash
psql -U postgres -d your_database < database/notifications_schema.sql
```

This creates:
- `notification_preferences` - User notification settings
- `notification_queue` - Queue of notifications to send
- `worker_locations` - Worker location preferences for matching
- `shift_notifications` - Tracking of sent notifications
- `eligible_workers_for_shift` - View for worker matching
- Triggers for automatic notification creation

### Step 3: Create Test Users

```bash
psql -U postgres -d your_database < database/test_users.sql
```

## Supabase Edge Functions Setup

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

```bash
supabase link --project-ref your-project-ref
```

### Step 4: Set Environment Secrets

```bash
# SendGrid
supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key

# Twilio
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=+4712345678

# OneSignal
supabase secrets set ONESIGNAL_APP_ID=your_app_id
supabase secrets set ONESIGNAL_API_KEY=your_api_key
```

### Step 5: Deploy Edge Function

```bash
supabase functions deploy send-notifications
```

### Step 6: Set Up Cron Job

In Supabase Dashboard > Database > Cron Jobs:

```sql
SELECT cron.schedule(
  'process-notification-queue',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/send-notifications',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

## Worker Matching Algorithm

The system matches workers to shifts based on:

### 1. Required Criteria
- **Profession match**: Worker's profession must match shift requirement
- **Availability**: Worker status must be 'available'
- **No duplicate**: Worker hasn't already applied for this shift

### 2. Scoring System (0-170 points)

**Wage Match (0-100 points)**
- Worker rate ≤ shift wage: 100 points
- Worker rate ≤ 110% of shift wage: 80 points
- Worker rate ≤ 120% of shift wage: 60 points
- Worker rate > 120% of shift wage: 40 points

**Rating (0-50 points)**
- Average rating ≥ 4.5: 50 points
- Average rating ≥ 4.0: 30 points
- Average rating ≥ 3.5: 10 points
- Average rating < 3.5: 0 points

**Experience (0-20 points)**
- Total reviews ≥ 10: 20 points
- Total reviews ≥ 5: 10 points
- Total reviews < 5: 0 points

Workers are ranked by match_score (highest first), then by average_rating.

## Frontend Integration

### 1. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### 2. Create Supabase Client

Create `src/api/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 3. Real-Time Subscriptions

Subscribe to new shifts in worker dashboard:

```javascript
import { supabase } from '../api/supabase'

// Subscribe to new shifts
const subscription = supabase
  .channel('new-shifts')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'shifts',
      filter: `profession_required=eq.${userProfession}`
    },
    (payload) => {
      // Show in-app notification
      showNotification('Ny vakt tilgjengelig!', payload.new)
    }
  )
  .subscribe()

// Cleanup
return () => {
  subscription.unsubscribe()
}
```

### 4. Create Shift with Notifications

```javascript
async function createShift(shiftData) {
  const { data, error } = await supabase
    .from('shifts')
    .insert([{
      department_id: user.id,
      start_time: shiftData.startTime,
      end_time: shiftData.endTime,
      profession_required: shiftData.profession,
      hourly_wage: shiftData.hourlyWage,
      description: shiftData.description,
      status: 'open'
    }])
    .select()
  
  if (error) throw error
  
  // Trigger will automatically notify eligible workers
  return data[0]
}
```

### 5. View Eligible Workers

```javascript
async function getEligibleWorkers(shiftId) {
  const { data, error } = await supabase
    .rpc('get_eligible_workers', { shift_uuid: shiftId })
  
  if (error) throw error
  return data
}
```

## Notification Templates

### Email Template
- **Subject**: "Ny vakt tilgjengelig - [Profession]"
- **Body**: Shift details with CTA button
- **Language**: Norwegian (Bokmål)

### SMS Template
```
Ny vakt: [Profession]
Dato: [Date]
Lønn: [Wage] NOK/t
Se mer: helseplattform.no
```

### Push Notification
```json
{
  "title": "Ny vakt tilgjengelig",
  "body": "Sykepleier - 15.12.2024 22:00",
  "data": {
    "shift_id": "uuid",
    "action": "view_shift"
  }
}
```

## Notification Preferences

Users can control notifications in their settings:

### Email
- New shifts matching their profile
- Shift updates (time changes, cancellations)
- Application status updates
- New messages

### SMS
- Urgent notifications only (by default)
- Shift updates
- Can be disabled entirely

### Push
- Real-time in-app notifications
- New shifts
- Messages
- Application updates

### Quiet Hours
- Set start and end times
- No notifications during quiet hours
- Urgent notifications may override

## Testing

### 1. Test Notification Preferences

```sql
-- Set up test worker with all notifications enabled
INSERT INTO notification_preferences (
  user_id,
  email_enabled,
  sms_enabled,
  push_enabled,
  phone_number,
  push_token
) VALUES (
  'worker-uuid',
  TRUE,
  TRUE,
  TRUE,
  '+4712345678',
  'test-push-token'
);
```

### 2. Test Shift Creation

```sql
-- Create a test shift
INSERT INTO shifts (
  department_id,
  start_time,
  end_time,
  profession_required,
  hourly_wage,
  status
) VALUES (
  'dept-uuid',
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '2 days' + INTERVAL '8 hours',
  'Sykepleier',
  450,
  'open'
);

-- Check notification queue
SELECT * FROM notification_queue WHERE status = 'pending';

-- Check who was notified
SELECT * FROM shift_notifications WHERE shift_id = 'shift-uuid';
```

### 3. Test Edge Function Locally

```bash
supabase functions serve send-notifications
```

Then trigger it:

```bash
curl -X POST http://localhost:54321/functions/v1/send-notifications \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Monitoring

### Check Notification Status

```sql
-- Pending notifications
SELECT COUNT(*) FROM notification_queue WHERE status = 'pending';

-- Failed notifications
SELECT * FROM notification_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;

-- Delivery rate
SELECT 
  type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM notification_queue
GROUP BY type;
```

### Check Worker Matching

```sql
-- See eligible workers for a shift
SELECT * FROM get_eligible_workers('shift-uuid');

-- Check match scores
SELECT 
  worker_name,
  profession,
  average_rating,
  match_score
FROM eligible_workers_for_shift
WHERE shift_id = 'shift-uuid'
ORDER BY match_score DESC;
```

## Rate Limiting

To prevent spam:

1. **Per-user limits**: Max 50 notifications per day
2. **Batch notifications**: Group similar notifications
3. **Quiet hours**: Respect user preferences
4. **Deduplication**: Don't send duplicate notifications

Implement in Edge Function:

```typescript
// Check daily limit
const { count } = await supabase
  .from('notification_queue')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())

if (count >= 50) {
  console.log('Daily notification limit reached for user:', userId)
  return false
}
```

## Troubleshooting

### Notifications Not Sending

1. Check Edge Function logs:
   ```bash
   supabase functions logs send-notifications
   ```

2. Verify secrets are set:
   ```bash
   supabase secrets list
   ```

3. Check notification queue:
   ```sql
   SELECT * FROM notification_queue WHERE status = 'failed';
   ```

### Workers Not Being Matched

1. Check worker status:
   ```sql
   SELECT id, full_name, status FROM workers WHERE profession = 'Sykepleier';
   ```

2. Verify worker locations:
   ```sql
   SELECT * FROM worker_locations WHERE worker_id = 'worker-uuid';
   ```

3. Test matching query:
   ```sql
   SELECT * FROM eligible_workers_for_shift WHERE shift_id = 'shift-uuid';
   ```

### Real-Time Not Working

1. Check Supabase Realtime is enabled in project settings
2. Verify RLS policies allow reading shifts
3. Check browser console for subscription errors

## Security Considerations

1. **API Keys**: Store in Supabase secrets, never in code
2. **Rate Limiting**: Implement per-user and global limits
3. **Validation**: Validate all notification content
4. **Opt-out**: Always provide unsubscribe option
5. **GDPR**: Store notification preferences, allow deletion
6. **Phone Numbers**: Validate format, encrypt if needed

## Cost Optimization

### SendGrid
- Free tier: 100 emails/day
- Paid: $19.95/month for 50,000 emails

### Twilio
- Pay-as-you-go: ~$0.08 per SMS to Norway
- Consider SMS only for urgent notifications

### OneSignal
- Free tier: Unlimited push notifications
- Recommended for most notifications

### Recommendations
1. Use push notifications as primary channel (free)
2. Use email for detailed information
3. Reserve SMS for urgent/time-sensitive notifications
4. Let users configure preferences

## Next Steps

1. Set up Supabase project
2. Configure third-party services
3. Deploy Edge Functions
4. Test with USER1 and USER2
5. Monitor delivery rates
6. Optimize based on user feedback

## Support

- Supabase Docs: https://supabase.com/docs
- SendGrid Docs: https://docs.sendgrid.com
- Twilio Docs: https://www.twilio.com/docs
- OneSignal Docs: https://documentation.onesignal.com