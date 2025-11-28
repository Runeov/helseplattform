import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabase';
import { createShift } from '../../api/shiftsService';
import EligibleWorkersList from '../../components/shifts/EligibleWorkersList';

export default function CreateShift() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [departmentInfo, setDepartmentInfo] = useState(null);
  
  const [shiftData, setShiftData] = useState({
    profession: '',
    date: '',
    startTime: '',
    endTime: '',
    hourlyWage: '',
    description: '',
  });

  useEffect(() => {
    loadDepartmentInfo();
  }, []);

  const loadDepartmentInfo = async () => {
    // Get department info from session or Supabase
    const userEmail = sessionStorage.getItem('user_email');
    
    if (supabase && userEmail) {
      try {
        // First get the profile to get the user ID
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('email', userEmail)
          .single();

        if (profileError) {
          console.error('Error loading profile:', profileError);
          return;
        }

        // Check if user is an employer
        if (profileData.role !== 'employer') {
          console.error('User is not an employer');
          return;
        }

        // Then get the department info using the profile ID
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('*')
          .eq('id', profileData.id)
          .single();

        if (!deptError && deptData) {
          setDepartmentInfo(deptData);
        } else {
          console.error('Error loading department:', deptError);
        }
      } catch (err) {
        console.error('Error loading department:', err);
      }
    }
  };

  const handleChange = (field, value) => {
    setShiftData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!departmentInfo) {
        throw new Error('Department information not loaded');
      }

      // Combine date and time
      const startDateTime = new Date(`${shiftData.date}T${shiftData.startTime}`);
      const endDateTime = new Date(`${shiftData.date}T${shiftData.endTime}`);

      const newShiftData = {
        departmentId: departmentInfo.id,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        profession: shiftData.profession,
        hourlyWage: parseInt(shiftData.hourlyWage),
        description: shiftData.description,
      };

      // Save to database
      const createdShift = await createShift(newShiftData);
      
      console.log('Vakt opprettet:', createdShift);
      alert('Vakt publisert! Tilgjengelige arbeidstakere vil bli varslet.');
      
      // Navigate back to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Error creating shift:', error);
      alert('Kunne ikke opprette vakt: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      shiftData.profession &&
      shiftData.date &&
      shiftData.startTime &&
      shiftData.endTime &&
      shiftData.hourlyWage &&
      parseInt(shiftData.hourlyWage) > 0
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/dashboard')}>
          ← Tilbake til oversikt
        </button>
      </div>

      <div style={styles.card}>
        <h1 style={styles.title}>Opprett ny vakt</h1>
        <p style={styles.subtitle}>
          Fyll ut informasjonen om vakten du ønsker å publisere
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Yrkeskategori *</label>
              <select
                style={styles.select}
                value={shiftData.profession}
                onChange={(e) => handleChange('profession', e.target.value)}
                required
              >
                <option value="">Velg yrkeskategori</option>
                <option value="Sykepleier">Sykepleier</option>
                <option value="Helsefagarbeider">Helsefagarbeider</option>
                <option value="Lege">Lege</option>
                <option value="Vernepleier">Vernepleier</option>
              </select>
              <small style={styles.helpText}>
                Hvilken type helsepersonell trenger du?
              </small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Dato *</label>
              <input
                type="date"
                style={styles.input}
                value={shiftData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Starttid *</label>
              <input
                type="time"
                style={styles.input}
                value={shiftData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Sluttid *</label>
              <input
                type="time"
                style={styles.input}
                value={shiftData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Timelønn (NOK) *</label>
            <input
              type="number"
              style={styles.input}
              value={shiftData.hourlyWage}
              onChange={(e) => handleChange('hourlyWage', e.target.value)}
              placeholder="450"
              min="200"
              max="1000"
              required
            />
            <small style={styles.helpText}>
              Anbefalt timelønn for {shiftData.profession || 'valgt yrke'}:
              {shiftData.profession === 'Lege' && ' 600-800 NOK'}
              {shiftData.profession === 'Sykepleier' && ' 400-550 NOK'}
              {shiftData.profession === 'Vernepleier' && ' 380-500 NOK'}
              {shiftData.profession === 'Helsefagarbeider' && ' 320-420 NOK'}
              {!shiftData.profession && ' Velg yrkeskategori først'}
            </small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Beskrivelse (valgfritt)</label>
            <textarea
              style={{...styles.input, minHeight: '120px', resize: 'vertical'}}
              value={shiftData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Beskriv vakten, spesielle krav, eller annen relevant informasjon..."
              maxLength="500"
            />
            <small style={styles.helpText}>
              {shiftData.description.length}/500 tegn
            </small>
          </div>

          {departmentInfo && (
            <div style={styles.infoBox}>
              <h3 style={styles.infoTitle}>Vaktinformasjon</h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Avdeling:</span>
                  <span style={styles.infoValue}>{departmentInfo.department_name}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Kommune:</span>
                  <span style={styles.infoValue}>{departmentInfo.municipality_name}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Kostnadssted:</span>
                  <span style={styles.infoValue}>{departmentInfo.cost_center_code}</span>
                </div>
              </div>
            </div>
          )}

          {/* Show eligible workers */}
          <EligibleWorkersList
            profession={shiftData.profession}
            hourlyWage={parseInt(shiftData.hourlyWage) || 0}
          />

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => navigate('/dashboard')}
            >
              Avbryt
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitButton,
                ...(isFormValid() ? {} : styles.submitButtonDisabled)
              }}
              disabled={!isFormValid() || loading}
            >
              {loading ? 'Oppretter...' : 'Publiser vakt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    marginBottom: '2rem',
  },
  backButton: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: 'none',
    color: '#667eea',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '2.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#718096',
    marginBottom: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
  infoBox: {
    background: '#f7fafc',
    borderRadius: '8px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
  },
  infoTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '1rem',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  infoLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#718096',
  },
  infoValue: {
    fontSize: '0.875rem',
    color: '#2d3748',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1rem',
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    color: '#718096',
    border: '1px solid #cbd5e0',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitButton: {
    padding: '0.75rem 2rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  submitButtonDisabled: {
    background: '#cbd5e0',
    cursor: 'not-allowed',
  },
};