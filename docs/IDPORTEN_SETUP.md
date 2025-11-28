# ID-porten Integration Setup Guide

This guide explains how to set up ID-porten authentication for the Helseplattform application.

## What is ID-porten?

ID-porten is Norway's national login solution for public services. It provides secure authentication using BankID, Buypass, or other approved electronic IDs. All Norwegian citizens can use ID-porten to access government services.

## Prerequisites

1. **Digdir Account**: You need an account at [Samarbeid Digdir](https://samarbeid.digdir.no/)
2. **Organization Number**: Your organization's Norwegian organization number (organisasjonsnummer)
3. **Test Environment Access**: Request access to ID-porten test environment

## Step 1: Register Your Application

### 1.1 Create Integration at Digdir

1. Log in to [Samarbeid Digdir](https://samarbeid.digdir.no/)
2. Navigate to "Integrasjoner" → "ID-porten"
3. Click "Ny integrasjon"
4. Fill in the required information:
   - **Integration name**: "Helseplattform"
   - **Description**: "Healthcare platform connecting municipalities with healthcare workers"
   - **Redirect URIs**: 
     - Development: `http://localhost:5173/auth/callback`
     - Production: `https://yourdomain.no/auth/callback`
   - **Scopes**: Select `openid` and `profile`
   - **Grant types**: Select `authorization_code`
   - **PKCE**: Enable (required for security)

### 1.2 Note Your Credentials

After creating the integration, you'll receive:
- **Client ID**: A unique identifier for your application
- **Client Secret**: Keep this secure (only needed for server-side flows)

## Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your ID-porten credentials:
   ```env
   # For test environment
   VITE_IDPORTEN_ISSUER=https://test.idporten.no
   VITE_IDPORTEN_AUTH_ENDPOINT=https://test.idporten.no/authorize
   VITE_IDPORTEN_TOKEN_ENDPOINT=https://test.idporten.no/token
   VITE_IDPORTEN_USERINFO_ENDPOINT=https://test.idporten.no/userinfo
   VITE_IDPORTEN_LOGOUT_ENDPOINT=https://test.idporten.no/endsession

   VITE_IDPORTEN_CLIENT_ID=your_actual_client_id
   VITE_IDPORTEN_CLIENT_SECRET=your_actual_client_secret
   VITE_IDPORTEN_REDIRECT_URI=http://localhost:5173/auth/callback
   ```

3. **Important**: Never commit `.env` to version control. It's already in `.gitignore`.

## Step 3: Test Environment Setup

### 3.1 Get Test Users

ID-porten provides synthetic test users for the test environment:

1. Go to [ID-porten Test Users](https://docs.digdir.no/docs/idporten/oidc/oidc_func_nosyntperson)
2. Use one of the provided test personal numbers (fødselsnummer)
3. Common test users:
   - `01019012345` - Standard test user
   - `02019012345` - Another test user

### 3.2 Test Login Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173/login`

3. Click "Logg inn med ID-porten"

4. You'll be redirected to ID-porten test environment

5. Select a test identity provider (e.g., "TestID")

6. Enter a test personal number

7. You'll be redirected back to your application

## Step 4: Production Setup

### 4.1 Switch to Production Environment

Update your `.env` for production:

```env
VITE_IDPORTEN_ISSUER=https://idporten.no
VITE_IDPORTEN_AUTH_ENDPOINT=https://idporten.no/authorize
VITE_IDPORTEN_TOKEN_ENDPOINT=https://idporten.no/token
VITE_IDPORTEN_USERINFO_ENDPOINT=https://idporten.no/userinfo
VITE_IDPORTEN_LOGOUT_ENDPOINT=https://idporten.no/endsession

VITE_IDPORTEN_CLIENT_ID=your_production_client_id
VITE_IDPORTEN_CLIENT_SECRET=your_production_client_secret
VITE_IDPORTEN_REDIRECT_URI=https://yourdomain.no/auth/callback
```

### 4.2 Update Redirect URIs

1. Go back to Samarbeid Digdir
2. Update your integration with production redirect URIs
3. Ensure HTTPS is used for all production URLs

### 4.3 Security Considerations

- **HTTPS Only**: Production must use HTTPS
- **Secure Storage**: Store tokens securely (use httpOnly cookies in production)
- **PKCE**: Always enabled for security
- **State Parameter**: Used for CSRF protection
- **Token Expiry**: Implement token refresh logic

## Step 5: Database Integration

### 5.1 Store ID-porten Data

When a user logs in via ID-porten, store:

```sql
INSERT INTO profiles (
  id,
  email,
  full_name,
  personal_number,
  idporten_sub,
  idporten_pid,
  security_level,
  last_idporten_login
) VALUES (
  auth.uid(),
  user_email,
  user_full_name,
  encrypted_personal_number,
  idporten_sub,
  idporten_pid,
  3, -- or 4 for Level4
  NOW()
);
```

### 5.2 Personal Number Encryption

Personal numbers (fødselsnummer) are sensitive and should be encrypted:

```sql
-- Encrypt before storing
UPDATE profiles 
SET personal_number = pgp_sym_encrypt('01019012345', 'encryption_key')
WHERE id = user_id;

-- Decrypt when needed
SELECT pgp_sym_decrypt(personal_number::bytea, 'encryption_key')
FROM profiles
WHERE id = user_id;
```

## Development Mode (Mock Authentication)

For local development without ID-porten setup:

1. Leave `VITE_IDPORTEN_CLIENT_ID` empty in `.env`
2. The app will automatically use mock authentication
3. Mock mode simulates ID-porten flow without actual redirect
4. Useful for frontend development and testing

## Troubleshooting

### Error: "Invalid redirect_uri"

**Solution**: Ensure the redirect URI in your code matches exactly what's registered in Digdir (including protocol, domain, and path).

### Error: "Invalid state parameter"

**Solution**: This is a CSRF protection error. Clear your browser's sessionStorage and try again.

### Error: "Token exchange failed"

**Solution**: 
- Check that your client credentials are correct
- Ensure you're using the correct environment (test vs production)
- Verify PKCE is enabled in your integration

### Users Can't Log In

**Solution**:
- In test: Ensure you're using valid test personal numbers
- In production: Verify users have valid Norwegian e-IDs (BankID, Buypass, etc.)

## Security Best Practices

1. **Never expose client secrets** in frontend code
2. **Use HTTPS** in production
3. **Implement token refresh** for long sessions
4. **Log security events** (failed logins, token issues)
5. **Encrypt personal numbers** in database
6. **Validate tokens** on backend
7. **Set appropriate token expiry** times
8. **Use secure session storage** (httpOnly cookies)

## API Documentation

Full ID-porten OIDC documentation:
- [ID-porten OIDC Guide](https://docs.digdir.no/docs/idporten/oidc/oidc_guide_idporten)
- [OIDC API Reference](https://docs.digdir.no/docs/idporten/oidc/oidc_api_admin)
- [Test Environment](https://docs.digdir.no/docs/idporten/oidc/oidc_func_nosyntperson)

## Support

For ID-porten issues:
- [Digdir Support](https://samarbeid.digdir.no/id-porten/id-porten/18)
- [Slack Community](https://join.slack.com/t/samarbeid-digdir/shared_invite/...)

For application issues:
- Check application logs
- Review browser console for errors
- Verify environment variables are set correctly