// Supabase Edge Function to send notifications
// Triggered by notification_queue inserts or scheduled runs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY')

interface NotificationRecord {
  id: string
  user_id: string
  type: 'email' | 'sms' | 'push'
  channel: string
  title: string
  body: string
  data: any
  status: string
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get pending notifications
    const { data: notifications, error } = await supabase
      .from('notification_queue')
      .select(`
        *,
        profiles!inner(email, full_name),
        notification_preferences!inner(*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(100)

    if (error) throw error

    const results = []

    for (const notification of notifications as any[]) {
      try {
        let success = false
        let providerId = null

        switch (notification.type) {
          case 'email':
            if (notification.notification_preferences.email_enabled) {
              const result = await sendEmail(notification, notification.profiles)
              success = result.success
              providerId = result.messageId
            }
            break

          case 'sms':
            if (notification.notification_preferences.sms_enabled && 
                notification.notification_preferences.phone_number) {
              const result = await sendSMS(
                notification,
                notification.notification_preferences.phone_number
              )
              success = result.success
              providerId = result.messageId
            }
            break

          case 'push':
            if (notification.notification_preferences.push_enabled &&
                notification.notification_preferences.push_token) {
              const result = await sendPush(
                notification,
                notification.notification_preferences.push_token
              )
              success = result.success
              providerId = result.messageId
            }
            break
        }

        // Update notification status
        await supabase
          .from('notification_queue')
          .update({
            status: success ? 'sent' : 'failed',
            sent_at: success ? new Date().toISOString() : null,
            failed_at: success ? null : new Date().toISOString(),
            provider_id: providerId,
          })
          .eq('id', notification.id)

        results.push({ id: notification.id, success })
      } catch (error) {
        console.error(`Failed to send notification ${notification.id}:`, error)
        
        await supabase
          .from('notification_queue')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: error.message,
          })
          .eq('id', notification.id)

        results.push({ id: notification.id, success: false, error: error.message })
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Send email via SendGrid
async function sendEmail(notification: NotificationRecord, profile: any) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: profile.email, name: profile.full_name }],
        subject: notification.title,
      }],
      from: {
        email: 'noreply@helseplattform.no',
        name: 'HelsePlattform',
      },
      content: [{
        type: 'text/html',
        value: generateEmailHTML(notification, profile),
      }],
    }),
  })

  return {
    success: response.ok,
    messageId: response.headers.get('X-Message-Id'),
  }
}

// Send SMS via Twilio
async function sendSMS(notification: NotificationRecord, phoneNumber: string) {
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: TWILIO_PHONE_NUMBER!,
        Body: `${notification.title}\n\n${notification.body}\n\nSe mer på helseplattform.no`,
      }),
    }
  )

  const data = await response.json()
  return {
    success: response.ok,
    messageId: data.sid,
  }
}

// Send push notification via OneSignal
async function sendPush(notification: NotificationRecord, pushToken: string) {
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [pushToken],
      headings: { en: notification.title, nb: notification.title },
      contents: { en: notification.body, nb: notification.body },
      data: notification.data,
    }),
  })

  const data = await response.json()
  return {
    success: response.ok,
    messageId: data.id,
  }
}

// Generate HTML email template
function generateEmailHTML(notification: NotificationRecord, profile: any): string {
  const shiftData = notification.data || {}
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🏥 HelsePlattform</h1>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #2d3748; margin-top: 0;">${notification.title}</h2>
    
    <p style="color: #4a5568; font-size: 16px;">Hei ${profile.full_name},</p>
    
    <p style="color: #4a5568;">${notification.body}</p>
    
    ${shiftData.profession ? `
    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #2d3748;">Vaktdetaljer:</h3>
      <ul style="list-style: none; padding: 0;">
        <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
          <strong>Yrke:</strong> ${shiftData.profession}
        </li>
        <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
          <strong>Dato:</strong> ${new Date(shiftData.start_time).toLocaleDateString('nb-NO')}
        </li>
        <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
          <strong>Tid:</strong> ${new Date(shiftData.start_time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
        </li>
        <li style="padding: 8px 0;">
          <strong>Timelønn:</strong> ${shiftData.hourly_wage} NOK
        </li>
      </ul>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://helseplattform.no/dashboard" 
         style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
        Se vakt og søk nå
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="color: #718096; font-size: 14px; text-align: center;">
      Du mottar denne e-posten fordi du har aktivert varsler for nye vakter.<br>
      <a href="https://helseplattform.no/settings/notifications" style="color: #667eea;">Endre varslingsinnstillinger</a>
    </p>
  </div>
</body>
</html>
  `
}