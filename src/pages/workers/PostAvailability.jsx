import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabase';

export default function PostAvailability() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [workerId, setWorkerId] = useState(null);
  
  const [availabilityData, setAvailabilityData] = useState({
    date: '',
    isRecurring: false,
    recurrencePattern: '',
    recurrenceEndDate: '',
    shiftTypes: [],
    notes: '',
  });

  useEffect(() => {
    loadWorkerInfo();
  }, []);

  const loadWorkerInfo = async () => {
    const userEmail = sessionStorage.getItem('user_email');
    
    if (supabase && userEmail) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .eq('role', 'worker')
          .single();

        if (!error && data) {
          setWorkerId(data.id);
        }
      } catch (err) {
        console.error('Error loading worker info:', err);
      }
    }
  };

  const shiftTypeOptions = [
    { value: 'day', label: 'Dagvakt', time: '08:00-16:00' },
    { value: 'evening', label: 'Kveldsvakt', time: '16:00-00:00' },
    { value: 'night', label: 'Nattevakt', time: '22:00-06:00' },
    { value: 'weekend', label: 'Helgevakt', time: 'Lør/Søn' },
  ];

  const handleChange = (field, value) => {
    setAvailabilityData(prev => ({ ...prev, [field]: value }));
  };

  const handleShiftTypeToggle = (shiftType) => {
    setAvailabilityData(prev => {
      const currentTypes = prev.shiftTypes || [];
      const isSelected = currentTypes.includes(shiftType);
      
      return {
        ...prev,
        shiftTypes: isSelected
          ? currentTypes.filter(t => t !== shiftType)
          : [...currentTypes, shiftType]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!workerId) {
        throw new Error('Worker ID not found. Please login again.');
      }

      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      if (!availabilityData.shiftTypes || availabilityData.shiftTypes.length === 0) {
        throw new Error('Velg minst én vakttype');
      }

      // Set start time to beginning of day and end time to end of day
      const startDateTime = new Date(availabilityData.date);
      startDateTime.setHours(0, 0, 0, 0);
      
      const endDateTime = new Date(availabilityData.date);
      endDateTime.setHours(23, 59, 59, 999);

      const newAvailability = {
        worker_id: workerId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        is_recurring: availabilityData.isRecurring,
        recurrence_pattern: availabilityData.isRecurring ? availabilityData.recurrencePattern : null,
        recurrence_end_date: availabilityData.isRecurring ? availabilityData.recurrenceEndDate : null,
        preferred_shift_types: availabilityData.shiftTypes,
        notes: availabilityData.notes,
        status: 'available',
      };

      const { data, error } = await supabase
        .from('worker_availability')
        .insert([newAvailability])
        .select()
        .single();

      if (error) throw error;
      
      console.log('Availability posted:', data);
      alert('Tilgjengelighet registrert!');
      navigate('/profile');

    } catch (error) {
      console.error('Error posting availability:', error);
      alert('Kunne ikke registrere tilgjengelighet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      availabilityData.date &&
      availabilityData.shiftTypes &&
      availabilityData.shiftTypes.length > 0 &&
      (!availabilityData.isRecurring ||
        (availabilityData.recurrencePattern && availabilityData.recurrenceEndDate))
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/profile')}>
          ← Tilbake til profil
        </button>
      </div>

      <div style={styles.card}>
        <h1 style={styles.title}>Registrer tilgjengelighet</h1>
        <p style={styles.subtitle}>
          La arbeidsgivere vite når du er tilgjengelig for vakter
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Dato *</label>
            <input
              type="date"
              style={styles.input}
              value={availabilityData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <small style={styles.helpText}>
              Velg datoen du er tilgjengelig
            </small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Vakttyper * (velg minst én)</label>
            <div style={styles.checkboxGrid}>
              {shiftTypeOptions.map((option) => (
                <label key={option.value} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={availabilityData.shiftTypes.includes(option.value)}
                    onChange={() => handleShiftTypeToggle(option.value)}
                    style={styles.checkbox}
                  />
                  <span>
                    {option.label}
                    <br />
                    <small style={styles.helpText}>{option.time}</small>
                  </span>
                </label>
              ))}
            </div>
            <small style={styles.helpText}>
              Velg hvilke typer vakter du er tilgjengelig for
            </small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={availabilityData.isRecurring}
                onChange={(e) => handleChange('isRecurring', e.target.checked)}
                style={styles.checkbox}
              />
              <span>Gjentakende tilgjengelighet</span>
            </label>
          </div>

          {availabilityData.isRecurring && (
            <>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Gjentas *</label>
                  <select
                    style={styles.select}
                    value={availabilityData.recurrencePattern}
                    onChange={(e) => handleChange('recurrencePattern', e.target.value)}
                    required={availabilityData.isRecurring}
                  >
                    <option value="">Velg mønster</option>
                    <option value="daily">Daglig</option>
                    <option value="weekly">Ukentlig</option>
                    <option value="biweekly">Annenhver uke</option>
                    <option value="monthly">Månedlig</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Slutt dato *</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={availabilityData.recurrenceEndDate}
                    onChange={(e) => handleChange('recurrenceEndDate', e.target.value)}
                    min={availabilityData.date}
                    required={availabilityData.isRecurring}
                  />
                </div>
              </div>
            </>
          )}


          <div style={styles.formGroup}>
            <label style={styles.label}>Notater (valgfritt)</label>
            <textarea
              style={{...styles.input, minHeight: '100px', resize: 'vertical'}}
              value={availabilityData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="F.eks. 'Kan ta ekstravakter med kort varsel' eller 'Foretrekker nattevakter'"
              maxLength="300"
            />
            <small style={styles.helpText}>
              {availabilityData.notes.length}/300 tegn
            </small>
          </div>

          <div style={styles.infoBox}>
            <div style={styles.infoIcon}>💡</div>
            <div>
              <strong>Tips:</strong> Jo mer tilgjengelighet du registrerer, jo flere vakter vil du bli varslet om. Du kan alltid oppdatere eller slette tilgjengelighet senere.
            </div>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => navigate('/profile')}
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
              {loading ? 'Registrerer...' : 'Registrer tilgjengelighet'}
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
  },
  select: {
    padding: '0.75rem',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '1rem',
    background: 'white',
    cursor: 'pointer',
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.75rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#2d3748',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  helpText: {
    fontSize: '0.75rem',
    color: '#718096',
  },
  infoBox: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    background: '#dbeafe',
    borderRadius: '8px',
    border: '1px solid #93c5fd',
    fontSize: '0.875rem',
    color: '#1e40af',
  },
  infoIcon: {
    fontSize: '1.5rem',
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
  },
  submitButtonDisabled: {
    background: '#cbd5e0',
    cursor: 'not-allowed',
  },
};