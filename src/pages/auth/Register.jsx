import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initiateIdPortenLogin, mockIdPortenLogin, isIdPortenConfigured } from '../../api/idporten';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [useMock, setUseMock] = useState(!isIdPortenConfigured());

  const handleIdPortenRegistration = async () => {
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
      console.error('Registration error:', error);
      alert('Registrering feilet: ' + error.message);
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

        <h1 style={styles.title}>Opprett konto</h1>
        <p style={styles.subtitle}>
          Registrer deg med ID-porten for sikker identitetsverifisering
        </p>

        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>Hvorfor ID-porten?</h3>
          <ul style={styles.infoList}>
            <li>✓ Sikker identitetsverifisering</li>
            <li>✓ Automatisk utfylling av personopplysninger</li>
            <li>✓ Ingen passord å huske</li>
            <li>✓ Bruker BankID eller Buypass</li>
          </ul>
        </div>

        <button
          style={{
            ...styles.idPortenButton,
            ...(loading ? styles.idPortenButtonDisabled : {}),
          }}
          onClick={handleIdPortenRegistration}
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
              Registrer med ID-porten
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

        <div style={styles.steps}>
          <h3 style={styles.stepsTitle}>Hva skjer etter registrering?</h3>
          <ol style={styles.stepsList}>
            <li>Du verifiserer din identitet med ID-porten</li>
            <li>Du velger rolle (helsepersonell eller kommune)</li>
            <li>Du fyller ut nødvendig informasjon</li>
            <li>Din profil opprettes og du kan begynne å bruke plattformen</li>
          </ol>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Har du allerede en konto? <a href="/login" style={styles.link}>Logg inn her</a>
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
    maxWidth: '600px',
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
  infoBox: {
    background: '#f7fafc',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  infoTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '1rem',
  },
  infoList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
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
    marginBottom: '1rem',
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
    padding: '0.75rem',
    background: '#fef3c7',
    borderRadius: '6px',
    border: '1px solid #fbbf24',
    marginBottom: '2rem',
  },
  mockText: {
    fontSize: '0.875rem',
    color: '#92400e',
    margin: 0,
    textAlign: 'center',
  },
  steps: {
    marginTop: '2rem',
    padding: '1.5rem',
    background: '#f7fafc',
    borderRadius: '8px',
  },
  stepsTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '1rem',
  },
  stepsList: {
    paddingLeft: '1.5rem',
    margin: 0,
    color: '#4a5568',
    fontSize: '0.875rem',
    lineHeight: '1.8',
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