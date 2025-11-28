import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleIdPortenCallback } from '../../api/idporten';

/**
 * ID-porten OAuth Callback Handler
 * Handles the redirect from ID-porten after authentication
 */
export default function IdPortenCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for errors from ID-porten
        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }

        // Validate required parameters
        if (!code || !state) {
          throw new Error('Missing required parameters from ID-porten');
        }

        setStatus('exchanging');

        // Exchange authorization code for tokens and user info
        const { tokens, userInfo } = await handleIdPortenCallback(code, state);

        setStatus('creating_profile');

        // Store tokens (in production, use secure storage)
        sessionStorage.setItem('access_token', tokens.access_token);
        sessionStorage.setItem('id_token', tokens.id_token);

        // Store user info for profile creation
        sessionStorage.setItem('idporten_user', JSON.stringify(userInfo));

        setStatus('success');

        // Redirect to profile completion or dashboard
        // Check if user exists in database
        const userExists = await checkUserExists(userInfo.pid);

        if (userExists) {
          // Existing user - go to dashboard
          navigate('/dashboard');
        } else {
          // New user - complete registration
          navigate('/register/complete');
        }
      } catch (err) {
        console.error('ID-porten callback error:', err);
        setError(err.message);
        setStatus('error');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  /**
   * Check if user exists in database
   * @param {string} personalNumber - User's fødselsnummer
   * @returns {Promise<boolean>}
   */
  async function checkUserExists(personalNumber) {
    // TODO: Implement actual API call to check if user exists
    // For now, return false to always show registration
    return false;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {status === 'processing' && (
          <>
            <div style={styles.spinner}></div>
            <h2 style={styles.title}>Behandler ID-porten innlogging...</h2>
            <p style={styles.text}>Vennligst vent</p>
          </>
        )}

        {status === 'exchanging' && (
          <>
            <div style={styles.spinner}></div>
            <h2 style={styles.title}>Verifiserer identitet...</h2>
            <p style={styles.text}>Henter brukerinformasjon fra ID-porten</p>
          </>
        )}

        {status === 'creating_profile' && (
          <>
            <div style={styles.spinner}></div>
            <h2 style={styles.title}>Oppretter profil...</h2>
            <p style={styles.text}>Klargjør din konto</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.title}>Innlogging vellykket!</h2>
            <p style={styles.text}>Omdirigerer...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={styles.errorIcon}>✕</div>
            <h2 style={styles.title}>Innlogging feilet</h2>
            <p style={styles.errorText}>{error}</p>
            <button
              style={styles.button}
              onClick={() => navigate('/login')}
            >
              Tilbake til innlogging
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxWidth: '500px',
    width: '100%',
    padding: '3rem',
    textAlign: 'center',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 2rem',
  },
  successIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: '#38a169',
    color: 'white',
    fontSize: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 2rem',
  },
  errorIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: '#e53e3e',
    color: 'white',
    fontSize: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 2rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '1rem',
  },
  text: {
    fontSize: '1rem',
    color: '#718096',
  },
  errorText: {
    fontSize: '0.875rem',
    color: '#e53e3e',
    marginBottom: '1.5rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);