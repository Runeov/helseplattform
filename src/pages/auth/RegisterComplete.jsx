import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabase';
import { maskPersonalNumber } from '../../utils/personalNumber';

/**
 * Registration Completion Page
 * Shown after ID-porten authentication to complete user profile
 */
export default function RegisterComplete() {
  const navigate = useNavigate();
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [idPortenData, setIdPortenData] = useState(null);

  // Common form state
  const [username, setUsername] = useState('');

  // Worker form state
  const [workerData, setWorkerData] = useState({
    hprNumber: '',
    profession: '',
    hourlyRate: '',
    bio: '',
  });

  // Employer form state
  const [employerData, setEmployerData] = useState({
    municipality: '',
    department: '',
    costCenter: '',
    role: '',
  });

  useEffect(() => {
    // Get ID-porten user data from session storage
    const storedUser = sessionStorage.getItem('idporten_user');
    
    if (!storedUser) {
      // No ID-porten data, redirect to login
      navigate('/login');
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      setIdPortenData(userData);
    } catch (error) {
      console.error('Failed to parse ID-porten data:', error);
      navigate('/login');
    }
  }, [navigate]);

  const handleWorkerChange = (field, value) => {
    setWorkerData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmployerChange = (field, value) => {
    setEmployerData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (userType === 'worker') {
        if (!supabase) {
          alert('Supabase ikke konfigurert. Legg til credentials i .env');
          setLoading(false);
          return;
        }

        // Step 1: Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: `${username}@helsepersonell.no`,
          password: Math.random().toString(36).slice(-12), // Random password
        });

        if (authError) throw authError;
        const userId = authData.user.id;

        // Step 2: Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: userId,
            email: `${username}@helsepersonell.no`,
            username: username,
            full_name: idPortenData.name,
            role: 'worker',
            personal_number: idPortenData.pid,
            idporten_sub: idPortenData.sub,
            security_level: idPortenData.security_level || 3,
          }]);

        if (profileError) throw profileError;

        // Step 3: Create worker record
        const { error: workerError } = await supabase
          .from('workers')
          .insert([{
            id: userId,
            hpr_number: workerData.hprNumber,
            profession: workerData.profession,
            hourly_rate: parseInt(workerData.hourlyRate),
            bio: workerData.bio || '',
            status: 'available',
          }]);

        if (workerError) throw workerError;

        // Store session
        sessionStorage.setItem('user_email', `${username}@helsepersonell.no`);
        sessionStorage.setItem('user_role', 'worker');
        sessionStorage.setItem('user_name', idPortenData.name);
        sessionStorage.removeItem('idporten_user');

        alert('Profil opprettet!');
        navigate('/profile');
        
      } else if (userType === 'employer') {
        if (!supabase) {
          alert('Supabase ikke konfigurert. Legg til credentials i .env');
          setLoading(false);
          return;
        }

        // Step 1: Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: `${username}@${employerData.municipality.toLowerCase()}.kommune.no`,
          password: Math.random().toString(36).slice(-12), // Random password
        });

        if (authError) throw authError;
        const userId = authData.user.id;

        // Step 2: Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: userId,
            email: `${username}@${employerData.municipality.toLowerCase()}.kommune.no`,
            username: username,
            full_name: idPortenData.name,
            role: 'employer',
            personal_number: idPortenData.pid,
            idporten_sub: idPortenData.sub,
            security_level: idPortenData.security_level || 3,
          }]);

        if (profileError) throw profileError;

        // Step 3: Create department record
        const { error: deptError } = await supabase
          .from('departments')
          .insert([{
            id: userId,
            municipality_name: employerData.municipality,
            department_name: employerData.department,
            cost_center_code: employerData.costCenter,
          }]);

        if (deptError) throw deptError;

        // Store session
        sessionStorage.setItem('user_email', `${username}@${employerData.municipality.toLowerCase()}.kommune.no`);
        sessionStorage.setItem('user_role', 'employer');
        sessionStorage.setItem('user_name', idPortenData.name);
        sessionStorage.removeItem('idporten_user');

        alert('Profil opprettet!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registrering feilet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isWorkerFormValid = () => {
    return (
      username.trim().length >= 3 &&
      workerData.hprNumber.trim().length >= 7 &&
      workerData.profession &&
      workerData.hourlyRate &&
      parseInt(workerData.hourlyRate) > 0
    );
  };

  const isEmployerFormValid = () => {
    return (
      username.trim().length >= 3 &&
      employerData.municipality.trim() &&
      employerData.department.trim() &&
      employerData.costCenter.trim() &&
      employerData.role
    );
  };

  if (!idPortenData) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner}></div>
          <p style={styles.text}>Laster...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.verifiedBadge}>
          <span style={styles.verifiedIcon}>✓</span>
          <span style={styles.verifiedText}>Verifisert med ID-porten</span>
        </div>

        <h1 style={styles.title}>Fullfør registrering</h1>
        <p style={styles.subtitle}>Din identitet er bekreftet</p>

        <div style={styles.userInfo}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Navn:</span>
            <span style={styles.infoValue}>{idPortenData.name}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Fødselsnummer:</span>
            <span style={styles.infoValue}>{maskPersonalNumber(idPortenData.pid)}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Sikkerhetsnivå:</span>
            <span style={styles.infoValue}>Nivå {idPortenData.security_level || 3}</span>
          </div>
        </div>

        {!userType ? (
          <>
            <p style={styles.rolePrompt}>Velg din rolle:</p>
            <div style={styles.roleSelection}>
              <button
                style={styles.roleButton}
                onClick={() => setUserType('worker')}
              >
                <div style={styles.roleIcon}>👨‍⚕️</div>
                <h3 style={styles.roleTitle}>Helsepersonell</h3>
                <p style={styles.roleDescription}>
                  Sykepleier, helsefagarbeider, lege eller vernepleier
                </p>
              </button>

              <button
                style={styles.roleButton}
                onClick={() => setUserType('employer')}
              >
                <div style={styles.roleIcon}>🏛️</div>
                <h3 style={styles.roleTitle}>Kommune-representant</h3>
                <p style={styles.roleDescription}>
                  Avdelingsleder, HR eller økonomi
                </p>
              </button>
            </div>
          </>
        ) : (
          <div style={styles.formContainer}>
            <button
              style={styles.backButton}
              onClick={() => setUserType(null)}
            >
              ← Tilbake til valg
            </button>

            <form onSubmit={handleSubmit} style={styles.form}>
              {userType === 'worker' ? (
                <>
                  <h2 style={styles.formTitle}>Helsepersonell-informasjon</h2>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Brukernavn *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="velg_et_brukernavn"
                      pattern="[a-z0-9_]{3,20}"
                      title="Brukernavn må være 3-20 tegn (kun små bokstaver, tall og understrek)"
                      required
                    />
                    <small style={styles.helpText}>
                      3-20 tegn (kun små bokstaver, tall og understrek). Ditt fulle navn "{idPortenData.name}" vil vises til andre brukere.
                    </small>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>HPR-nummer *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={workerData.hprNumber}
                      onChange={(e) => handleWorkerChange('hprNumber', e.target.value)}
                      placeholder="1234567"
                      pattern="[0-9]{7,9}"
                      title="HPR-nummer må være 7-9 siffer"
                      required
                    />
                    <small style={styles.helpText}>
                      7-9 siffer fra Helsepersonellregisteret
                    </small>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Yrkeskategori *</label>
                    <select
                      style={styles.select}
                      value={workerData.profession}
                      onChange={(e) => handleWorkerChange('profession', e.target.value)}
                      required
                    >
                      <option value="">Velg yrkeskategori</option>
                      <option value="Sykepleier">Sykepleier</option>
                      <option value="Helsefagarbeider">Helsefagarbeider</option>
                      <option value="Lege">Lege</option>
                      <option value="Vernepleier">Vernepleier</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Ønsket timepris (NOK) *</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={workerData.hourlyRate}
                      onChange={(e) => handleWorkerChange('hourlyRate', e.target.value)}
                      placeholder="450"
                      min="200"
                      max="1000"
                      required
                    />
                    <small style={styles.helpText}>
                      Din ønskede timepris for vakter
                    </small>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Om deg (valgfritt)</label>
                    <textarea
                      style={{...styles.input, minHeight: '100px', resize: 'vertical'}}
                      value={workerData.bio}
                      onChange={(e) => handleWorkerChange('bio', e.target.value)}
                      placeholder="Fortell litt om din erfaring og kompetanse..."
                      maxLength="500"
                    />
                    <small style={styles.helpText}>
                      {workerData.bio.length}/500 tegn
                    </small>
                  </div>

                  <button
                    type="submit"
                    style={{
                      ...styles.submitButton,
                      ...(isWorkerFormValid() ? {} : styles.submitButtonDisabled),
                    }}
                    disabled={!isWorkerFormValid() || loading}
                  >
                    {loading ? 'Oppretter profil...' : 'Opprett profil'}
                  </button>
                </>
              ) : (
                <>
                  <h2 style={styles.formTitle}>Kommune-informasjon</h2>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Brukernavn *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="velg_et_brukernavn"
                      pattern="[a-z0-9_]{3,20}"
                      title="Brukernavn må være 3-20 tegn (kun små bokstaver, tall og understrek)"
                      required
                    />
                    <small style={styles.helpText}>
                      3-20 tegn (kun små bokstaver, tall og understrek). Ditt fulle navn "{idPortenData.name}" vil vises til andre brukere.
                    </small>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Kommune *</label>
                    <select
                      style={styles.select}
                      value={employerData.municipality}
                      onChange={(e) => handleEmployerChange('municipality', e.target.value)}
                      required
                    >
                      <option value="">Velg kommune</option>
                      <option value="Oslo">Oslo kommune</option>
                      <option value="Bergen">Bergen kommune</option>
                      <option value="Trondheim">Trondheim kommune</option>
                      <option value="Stavanger">Stavanger kommune</option>
                      <option value="Bærum">Bærum kommune</option>
                      <option value="Gran">Gran kommune</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Arbeidssted/Avdeling *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={employerData.department}
                      onChange={(e) => handleEmployerChange('department', e.target.value)}
                      placeholder="F.eks. Solbakken Sykehjem"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Kostnadssted *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={employerData.costCenter}
                      onChange={(e) => handleEmployerChange('costCenter', e.target.value)}
                      placeholder="F.eks. OSLO-SYK-001"
                      required
                    />
                    <small style={styles.helpText}>
                      Brukes til fakturering og budsjettering
                    </small>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Din rolle *</label>
                    <select
                      style={styles.select}
                      value={employerData.role}
                      onChange={(e) => handleEmployerChange('role', e.target.value)}
                      required
                    >
                      <option value="">Velg rolle</option>
                      <option value="avdelingsleder">Avdelingsleder</option>
                      <option value="hr">HR</option>
                      <option value="okonomi">Økonomi</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    style={{
                      ...styles.submitButton,
                      ...(isEmployerFormValid() ? {} : styles.submitButtonDisabled),
                    }}
                    disabled={!isEmployerFormValid() || loading}
                  >
                    {loading ? 'Oppretter profil...' : 'Opprett profil'}
                  </button>
                </>
              )}
            </form>
          </div>
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
    maxWidth: '700px',
    width: '100%',
    padding: '3rem',
  },
  verifiedBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    background: '#d1fae5',
    borderRadius: '8px',
    marginBottom: '2rem',
  },
  verifiedIcon: {
    fontSize: '1.25rem',
    color: '#065f46',
  },
  verifiedText: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#065f46',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: '0.5rem',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#718096',
    marginBottom: '2rem',
    textAlign: 'center',
  },
  userInfo: {
    background: '#f7fafc',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #e2e8f0',
  },
  infoLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#4a5568',
  },
  infoValue: {
    fontSize: '0.875rem',
    color: '#2d3748',
  },
  rolePrompt: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  roleSelection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
  roleButton: {
    background: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    padding: '2rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
  },
  roleIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  roleTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '0.5rem',
  },
  roleDescription: {
    fontSize: '0.875rem',
    color: '#718096',
    margin: 0,
  },
  formContainer: {
    marginTop: '1rem',
  },
  backButton: {
    background: 'transparent',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
    padding: '0.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '0.5rem',
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
  select: {
    padding: '0.75rem',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '1rem',
    background: 'white',
    cursor: 'pointer',
  },
  helpText: {
    fontSize: '0.75rem',
    color: '#718096',
  },
  submitButton: {
    padding: '1rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1rem',
    transition: 'background 0.2s',
  },
  submitButtonDisabled: {
    background: '#cbd5e0',
    cursor: 'not-allowed',
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
  text: {
    textAlign: 'center',
    color: '#718096',
  },
};