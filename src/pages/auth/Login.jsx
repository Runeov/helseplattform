import React, { useState } from 'react';
import { initiateIdPortenLogin, mockIdPortenLogin, isIdPortenConfigured } from '../../api/idporten';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabase';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [useMock, setUseMock] = useState(!isIdPortenConfigured());
  const [showEmailLogin, setShowEmailLogin] = useState(true);
  const navigate = useNavigate();

  // Login state (username or email)
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!supabase) {
        alert('Supabase er ikke konfigurert. Vennligst sjekk .env filen.');
        setLoading(false);
        return;
      }

      // Determine if input is email or username
      const isEmail = usernameOrEmail.includes('@');
      let email = usernameOrEmail;

      // If username provided, look up the email
      if (!isEmail) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', usernameOrEmail.toLowerCase())
          .single();

        if (profileError || !profileData) {
          alert('Ugyldig brukernavn eller passord');
          setLoading(false);
          return;
        }

        email = profileData.email;
      }

      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('Login error:', error);
        alert('Ugyldig brukernavn/e-post eller passord');
        setLoading(false);
        return;
      }

      // Get user profile to determine role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profileData) {
        console.error('Profile error:', profileError);
        alert('Kunne ikke hente brukerprofil');
        setLoading(false);
        return;
      }

      console.log('Logged in as:', profileData.full_name, '(', profileData.role, ')');
      
      // Store session info
      sessionStorage.setItem('user_email', profileData.email);
      sessionStorage.setItem('user_role', profileData.role);
      sessionStorage.setItem('user_name', profileData.full_name);

      // Navigate based on role
      if (profileData.role === 'worker') {
        navigate('/profile');
      } else {
        navigate('/dashboard');
      }

    } catch (error) {
      console.error('Login error:', error);
      alert('Innlogging feilet: ' + error.message);
      setLoading(false);
    }
  };

  const handleIdPortenLogin = async () => {
    setLoading(true);
    
    try {
      if (useMock) {
        // Use mock authentication for development
        const { tokens, userInfo } = await mockIdPortenLogin();
        
        // Store tokens and user info
        sessionStorage.setItem('access_token', tokens.access_token);
        sessionStorage.setItem('id_token', tokens.id_token);
        sessionStorage.setItem('idporten_user', JSON.stringify(userInfo));
        
        // Redirect to registration completion
        navigate('/register/complete');
      } else {
        // Real ID-porten flow - will redirect to ID-porten
        await initiateIdPortenLogin();
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Innlogging feilet: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>🏥</div>
          <h1 style={styles.logoText}>HelsePlattform</h1>
        </div>

        <h2 style={styles.title}>Logg inn</h2>
        
        {/* Login method tabs */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(showEmailLogin ? styles.tabActive : {})
            }}
            onClick={() => setShowEmailLogin(true)}
          >
            Brukernavn / Passord
          </button>
          <button
            style={{
              ...styles.tab,
              ...(!showEmailLogin ? styles.tabActive : {})
            }}
            onClick={() => setShowEmailLogin(false)}
          >
            ID-porten
          </button>
        </div>

        {showEmailLogin ? (
          <>
            <p style={styles.subtitle}>
              Logg inn med brukernavn eller e-post
            </p>

            <form onSubmit={handleEmailLogin} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Brukernavn eller E-post</label>
                <input
                  type="text"
                  style={styles.input}
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="user1 eller user1@test.no"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Passord</label>
                <input
                  type="password"
                  style={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="USER1 eller USER2"
                  required
                />
              </div>

              <button
                type="submit"
                style={{
                  ...styles.loginButton,
                  ...(loading ? styles.loginButtonDisabled : {})
                }}
                disabled={loading}
              >
                {loading ? 'Logger inn...' : 'Logg inn'}
              </button>
            </form>

            <div style={styles.testAccounts}>
              <h4 style={styles.testAccountsTitle}>Tips:</h4>
              <div style={styles.testAccount}>
                Du kan logge inn med enten brukernavn eller e-post
                <br />
                <small>Eksempel: "user1" eller "user1@test.no"</small>
              </div>
            </div>
          </>
        ) : (
          <>
            <p style={styles.subtitle}>
              Sikker innlogging med ID-porten
            </p>

            <button
              style={{
                ...styles.idPortenButton,
                ...(loading ? styles.idPortenButtonDisabled : {}),
              }}
              onClick={handleIdPortenLogin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span style={styles.spinner}></span>
                  Kobler til ID-porten...
                </>
              ) : (
                <>
                  <span style={styles.idPortenIcon}>🔐</span>
                  Logg inn med ID-porten
                </>
              )}
            </button>

            {useMock && (
              <div style={styles.mockNotice}>
                <p style={styles.mockText}>
                  ⚠️ Utviklingsmodus: Bruker mock ID-porten
                </p>
              </div>
            )}

            <div style={styles.info}>
              <h3 style={styles.infoTitle}>Hva er ID-porten?</h3>
              <p style={styles.infoText}>
                ID-porten er den norske fellesløsningen for sikker pålogging til offentlige tjenester.
                Du logger inn med BankID, Buypass eller annen godkjent e-ID.
              </p>
            </div>
          </>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Har du ikke bruker? <a href="/register" style={styles.link}>Registrer deg her</a>
          </p>
        </div>
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
  },
  logo: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#718096',
    marginBottom: '2rem',
    textAlign: 'center',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2rem',
    borderBottom: '2px solid #e2e8f0',
  },
  tab: {
    flex: 1,
    padding: '0.75rem',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    color: '#718096',
    fontWeight: '500',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#667eea',
    borderBottomColor: '#667eea',
    fontWeight: '600',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#2d3748',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '1rem',
    transition: 'border-color 0.2s',
  },
  loginButton: {
    width: '100%',
    padding: '1rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1.125rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  loginButtonDisabled: {
    background: '#cbd5e0',
    cursor: 'not-allowed',
  },
  testAccounts: {
    marginTop: '2rem',
    padding: '1rem',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  testAccountsTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '0.75rem',
  },
  testAccount: {
    padding: '0.5rem 0',
    fontSize: '0.875rem',
    color: '#4a5568',
    borderBottom: '1px solid #e2e8f0',
  },
  idPortenButton: {
    width: '100%',
    padding: '1rem',
    background: '#0066CC',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1.125rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background 0.2s',
  },
  idPortenButtonDisabled: {
    background: '#cbd5e0',
    cursor: 'not-allowed',
  },
  idPortenIcon: {
    fontSize: '1.5rem',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTop: '3px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    display: 'inline-block',
  },
  mockNotice: {
    marginTop: '1rem',
    padding: '0.75rem',
    background: '#fef3c7',
    borderRadius: '6px',
    border: '1px solid #fbbf24',
  },
  mockText: {
    fontSize: '0.875rem',
    color: '#92400e',
    margin: 0,
    textAlign: 'center',
  },
  info: {
    marginTop: '2rem',
    padding: '1.5rem',
    background: '#f7fafc',
    borderRadius: '8px',
  },
  infoTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '0.5rem',
  },
  infoText: {
    fontSize: '0.875rem',
    color: '#4a5568',
    lineHeight: '1.5',
    margin: 0,
  },
  footer: {
    marginTop: '2rem',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.875rem',
    color: '#718096',
    margin: 0,
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '600',
  },
};