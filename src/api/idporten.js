/**
 * ID-porten OIDC Integration
 * 
 * Implements OpenID Connect authentication flow with ID-porten
 * Documentation: https://docs.digdir.no/docs/idporten/oidc/oidc_api_admin.html
 */

// ID-porten configuration
const IDPORTEN_CONFIG = {
  // Use test environment for development
  issuer: import.meta.env.VITE_IDPORTEN_ISSUER || 'https://test.idporten.no',
  authorizationEndpoint: import.meta.env.VITE_IDPORTEN_AUTH_ENDPOINT || 'https://test.idporten.no/authorize',
  tokenEndpoint: import.meta.env.VITE_IDPORTEN_TOKEN_ENDPOINT || 'https://test.idporten.no/token',
  userinfoEndpoint: import.meta.env.VITE_IDPORTEN_USERINFO_ENDPOINT || 'https://test.idporten.no/userinfo',
  endSessionEndpoint: import.meta.env.VITE_IDPORTEN_LOGOUT_ENDPOINT || 'https://test.idporten.no/endsession',
  
  // Client configuration (must be registered with ID-porten)
  clientId: import.meta.env.VITE_IDPORTEN_CLIENT_ID,
  clientSecret: import.meta.env.VITE_IDPORTEN_CLIENT_SECRET,
  redirectUri: import.meta.env.VITE_IDPORTEN_REDIRECT_URI || `${window.location.origin}/auth/callback`,
  
  // Requested scopes
  scope: 'openid profile',
  
  // Security level (3=substantial, 4=high)
  acrValues: 'Level3', // or 'Level4' for higher security
};

/**
 * Generates a random string for PKCE code verifier
 * @param {number} length - Length of the string
 * @returns {string} - Random string
 */
function generateRandomString(length = 43) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  
  return result;
}

/**
 * Generates SHA-256 hash and base64url encodes it
 * @param {string} plain - Plain text to hash
 * @returns {Promise<string>} - Base64url encoded hash
 */
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to base64url
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Initiates ID-porten login flow with PKCE
 * Redirects user to ID-porten authorization endpoint
 */
export async function initiateIdPortenLogin() {
  // Generate PKCE parameters
  const codeVerifier = generateRandomString(43);
  const codeChallenge = await sha256(codeVerifier);
  
  // Generate state for CSRF protection
  const state = generateRandomString(32);
  
  // Store in sessionStorage for callback
  sessionStorage.setItem('idporten_code_verifier', codeVerifier);
  sessionStorage.setItem('idporten_state', state);
  
  // Build authorization URL
  const params = new URLSearchParams({
    client_id: IDPORTEN_CONFIG.clientId,
    redirect_uri: IDPORTEN_CONFIG.redirectUri,
    response_type: 'code',
    scope: IDPORTEN_CONFIG.scope,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    acr_values: IDPORTEN_CONFIG.acrValues,
    ui_locales: 'nb', // Norwegian Bokmål
  });
  
  const authUrl = `${IDPORTEN_CONFIG.authorizationEndpoint}?${params.toString()}`;
  
  // Redirect to ID-porten
  window.location.href = authUrl;
}

/**
 * Handles the OAuth callback from ID-porten
 * Exchanges authorization code for tokens
 * @param {string} code - Authorization code from URL
 * @param {string} state - State parameter from URL
 * @returns {Promise<Object>} - User info and tokens
 */
export async function handleIdPortenCallback(code, state) {
  // Verify state to prevent CSRF
  const storedState = sessionStorage.getItem('idporten_state');
  if (state !== storedState) {
    throw new Error('Invalid state parameter - possible CSRF attack');
  }
  
  // Get code verifier for PKCE
  const codeVerifier = sessionStorage.getItem('idporten_code_verifier');
  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }
  
  // Exchange code for tokens
  const tokenResponse = await fetch(IDPORTEN_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: IDPORTEN_CONFIG.redirectUri,
      client_id: IDPORTEN_CONFIG.clientId,
      code_verifier: codeVerifier,
    }),
  });
  
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${error}`);
  }
  
  const tokens = await tokenResponse.json();
  
  // Get user info
  const userInfo = await getUserInfo(tokens.access_token);
  
  // Clean up session storage
  sessionStorage.removeItem('idporten_code_verifier');
  sessionStorage.removeItem('idporten_state');
  
  return {
    tokens,
    userInfo,
  };
}

/**
 * Fetches user information from ID-porten
 * @param {string} accessToken - Access token
 * @returns {Promise<Object>} - User information
 */
export async function getUserInfo(accessToken) {
  const response = await fetch(IDPORTEN_CONFIG.userinfoEndpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }
  
  const userInfo = await response.json();
  
  // ID-porten returns:
  // - sub: Subject identifier (unique per user)
  // - pid: Personal identifier (fødselsnummer)
  // - name: Full name
  // - locale: User's locale
  // - acr: Authentication Context Class Reference (security level)
  
  return userInfo;
}

/**
 * Logs out from ID-porten
 * @param {string} idToken - ID token from login
 */
export function logoutFromIdPorten(idToken) {
  const params = new URLSearchParams({
    id_token_hint: idToken,
    post_logout_redirect_uri: window.location.origin,
  });
  
  window.location.href = `${IDPORTEN_CONFIG.endSessionEndpoint}?${params.toString()}`;
}

/**
 * Mock ID-porten authentication for development/testing
 * Simulates the ID-porten flow without actual redirect
 * @returns {Promise<Object>} - Mock user info and tokens
 */
export async function mockIdPortenLogin() {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate truly unique mock personal number using timestamp
  const now = Date.now();
  const timestamp = now.toString().slice(-9); // Last 9 digits of timestamp
  const day = timestamp.slice(0, 2);
  const month = timestamp.slice(2, 4);
  const year = timestamp.slice(4, 6);
  const individual = timestamp.slice(6, 9);
  const mockPersonalNumber = `${day}${month}${year}${individual}00`;
  
  const mockSub = `mock-sub-${now}-${Math.random()}`;
  const mockName = `Test User ${now.toString().slice(-4)}`;
  
  return {
    tokens: {
      access_token: 'mock-access-token',
      id_token: 'mock-id-token',
      token_type: 'Bearer',
      expires_in: 3600,
    },
    userInfo: {
      sub: mockSub,
      pid: mockPersonalNumber,
      name: mockName,
      locale: 'nb',
      acr: 'Level3',
      security_level: 3,
    },
  };
}

/**
 * Checks if ID-porten is properly configured
 * @returns {boolean} - True if configured
 */
export function isIdPortenConfigured() {
  return !!(
    IDPORTEN_CONFIG.clientId &&
    IDPORTEN_CONFIG.redirectUri
  );
}

/**
 * Gets the current ID-porten configuration (for debugging)
 * @returns {Object} - Configuration object (without secrets)
 */
export function getIdPortenConfig() {
  return {
    issuer: IDPORTEN_CONFIG.issuer,
    authorizationEndpoint: IDPORTEN_CONFIG.authorizationEndpoint,
    redirectUri: IDPORTEN_CONFIG.redirectUri,
    scope: IDPORTEN_CONFIG.scope,
    acrValues: IDPORTEN_CONFIG.acrValues,
    isConfigured: isIdPortenConfigured(),
  };
}