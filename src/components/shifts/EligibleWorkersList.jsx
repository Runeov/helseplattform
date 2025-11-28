import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';

/**
 * Shows eligible workers for a shift based on profession and other criteria
 * Used when creating or viewing a shift
 */
export default function EligibleWorkersList({ profession, hourlyWage }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState({});

  // Initialize notification preferences for each worker
  const initNotificationPrefs = (workersList) => {
    const prefs = {};
    workersList.forEach(worker => {
      prefs[worker.worker_id] = {
        email: true,
        sms: true,
        push: true,
      };
    });
    setNotificationPrefs(prefs);
  };

  const toggleNotification = (workerId, type) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [type]: !prev[workerId]?.[type],
      }
    }));
  };

  useEffect(() => {
    if (profession) {
      fetchEligibleWorkers();
    } else {
      setWorkers([]);
    }
  }, [profession, hourlyWage]);

  const fetchEligibleWorkers = async () => {
    setLoading(true);
    
    try {
      if (!supabase) {
        console.log('Supabase not configured, skipping worker fetch');
        setWorkers([]);
        setLoading(false);
        return;
      }

      // Fetch workers matching the profession
      const { data, error } = await supabase
        .from('workers')
        .select(`
          id,
          profession,
          hourly_rate,
          average_rating,
          total_reviews,
          status,
          profiles!inner(
            full_name,
            username
          )
        `)
        .eq('profession', profession)
        .eq('status', 'available')
        .order('average_rating', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Calculate match scores
      const workersWithScores = (data || []).map(worker => {
        // Get profile data - profiles is a single object (one-to-one relationship), not an array
        const profile = worker.profiles;
        const avgRating = worker.average_rating || 0;
        const totalReviews = worker.total_reviews || 0;
        
        // Wage match score (0-100) - using 10% intervals
        // Workers whose rate is at or below the offered wage get highest score
        // Workers with higher rates get progressively lower scores based on the difference
        let wageScore = 40;
        if (hourlyWage > 0) {
          if (worker.hourly_rate <= hourlyWage) {
            // Worker accepts the offered wage - perfect match
            wageScore = 100;
          } else {
            // Calculate how much higher the worker's rate is (as percentage)
            const percentageOver = ((worker.hourly_rate - hourlyWage) / hourlyWage) * 100;
            // Score decreases by 10 for each 10% over the offered wage
            if (percentageOver <= 10) wageScore = 90;
            else if (percentageOver <= 20) wageScore = 80;
            else if (percentageOver <= 30) wageScore = 70;
            else if (percentageOver <= 40) wageScore = 60;
            else if (percentageOver <= 50) wageScore = 50;
            else if (percentageOver <= 60) wageScore = 40;
            else if (percentageOver <= 70) wageScore = 30;
            else if (percentageOver <= 80) wageScore = 20;
            else if (percentageOver <= 90) wageScore = 10;
            else wageScore = 0; // More than 90% over offered wage
          }
        }

        // Rating score (0-50)
        let ratingScore = 0;
        if (avgRating >= 4.5) ratingScore = 50;
        else if (avgRating >= 4.0) ratingScore = 40;
        else if (avgRating >= 3.5) ratingScore = 30;
        else if (avgRating >= 3.0) ratingScore = 20;
        else if (avgRating >= 2.5) ratingScore = 10;

        // Experience score (0-20)
        let experienceScore = 0;
        if (totalReviews >= 20) experienceScore = 20;
        else if (totalReviews >= 10) experienceScore = 15;
        else if (totalReviews >= 5) experienceScore = 10;
        else if (totalReviews >= 1) experienceScore = 5;

        const match_score = wageScore + ratingScore + experienceScore;

        return {
          worker_id: worker.id,
          worker_name: profile?.full_name || 'Ukjent navn',
          username: profile?.username || 'ukjent',
          profession: worker.profession,
          hourly_rate: worker.hourly_rate,
          average_rating: avgRating,
          total_reviews: totalReviews,
          match_score,
          wageScore, // Include for secondary sorting
        };
      });

      // Sort by match score, then by wage score (to prioritize workers who accept the offered wage)
      // If match scores are equal, sort by hourly rate (lower rate first)
      workersWithScores.sort((a, b) => {
        if (b.match_score !== a.match_score) {
          return b.match_score - a.match_score;
        }
        // If match scores are equal, prefer workers with lower hourly rates
        return a.hourly_rate - b.hourly_rate;
      });

      setWorkers(workersWithScores);
      initNotificationPrefs(workersWithScores);
    } catch (error) {
      console.error('Error fetching eligible workers:', error);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  if (!profession) {
    return (
      <div style={styles.placeholder}>
        <p style={styles.placeholderText}>
          Velg yrkeskategori for å se tilgjengelige arbeidstakere
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Finner tilgjengelige arbeidstakere...</p>
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>👥</div>
        <p style={styles.emptyText}>
          Ingen tilgjengelige {profession.toLowerCase()} funnet for øyeblikket
        </p>
        <small style={styles.emptyHint}>
          Vakten vil bli publisert og arbeidstakere vil bli varslet når de blir tilgjengelige
        </small>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>
          Tilgjengelige arbeidstakere ({workers.length})
        </h3>
        <p style={styles.subtitle}>
          Disse vil bli varslet når du publiserer vakten
        </p>
      </div>

      <div style={styles.workersList}>
        {workers.map((worker) => (
          <div key={worker.worker_id} style={styles.workerCard}>
            <div style={styles.workerHeader}>
              <div style={styles.workerInfo}>
                <div style={styles.workerAvatar}>
                  {worker.worker_name.charAt(0)}
                </div>
                <div>
                  <div style={styles.workerName}>{worker.worker_name}</div>
                  <div style={styles.workerUsername}>@{worker.username}</div>
                </div>
              </div>
              <div style={styles.matchBadge}>
                {worker.match_score >= 150 ? '🌟 Topp match' : '✓ God match'}
              </div>
            </div>

            <div style={styles.workerDetails}>
              <div style={styles.detail}>
                <span style={styles.detailIcon}>⭐</span>
                <span>{worker.average_rating.toFixed(1)} ({worker.total_reviews} vurderinger)</span>
              </div>
              <div style={styles.detail}>
                <span style={styles.detailIcon}>💰</span>
                <span>{worker.hourly_rate} NOK/time</span>
              </div>
              <div style={styles.detail}>
                <span style={styles.detailIcon}>🏥</span>
                <span>{worker.profession}</span>
              </div>
            </div>

            {/* Notification preferences */}
            <div style={styles.notificationPrefs}>
              <span style={styles.notificationLabel}>Varsle via:</span>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={notificationPrefs[worker.worker_id]?.email ?? true}
                  onChange={() => toggleNotification(worker.worker_id, 'email')}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxIcon}>📧</span>
                E-post
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={notificationPrefs[worker.worker_id]?.sms ?? true}
                  onChange={() => toggleNotification(worker.worker_id, 'sms')}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxIcon}>📱</span>
                SMS
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={notificationPrefs[worker.worker_id]?.push ?? true}
                  onChange={() => toggleNotification(worker.worker_id, 'push')}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxIcon}>🔔</span>
                Push
              </label>
            </div>

            <div style={styles.workerFooter}>
              <div style={styles.matchScore}>
                Match: {worker.match_score}/170
              </div>
              <button
                type="button"
                style={styles.viewProfileButton}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedWorker(worker);
                }}
              >
                Se profil
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.notificationInfo}>
        <div style={styles.infoIcon}>📧</div>
        <div>
          <strong>Automatisk varsling:</strong> Alle {workers.length} arbeidstakere vil motta varsel via e-post, SMS og/eller push-varsling basert på deres innstillinger.
        </div>
      </div>

      {/* Worker Profile Modal */}
      {selectedWorker && (
        <div style={styles.modalOverlay} onClick={() => setSelectedWorker(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Arbeidstakerprofil</h3>
              <button
                type="button"
                style={styles.modalClose}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedWorker(null);
                }}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.modalProfile}>
                <div style={styles.modalAvatar}>
                  {selectedWorker.worker_name.charAt(0)}
                </div>
                <div>
                  <div style={styles.modalName}>{selectedWorker.worker_name}</div>
                  <div style={styles.modalUsername}>@{selectedWorker.username}</div>
                </div>
              </div>
              
              <div style={styles.modalStats}>
                <div style={styles.modalStat}>
                  <div style={styles.modalStatValue}>{selectedWorker.average_rating.toFixed(1)}</div>
                  <div style={styles.modalStatLabel}>Vurdering</div>
                </div>
                <div style={styles.modalStat}>
                  <div style={styles.modalStatValue}>{selectedWorker.total_reviews}</div>
                  <div style={styles.modalStatLabel}>Anmeldelser</div>
                </div>
                <div style={styles.modalStat}>
                  <div style={styles.modalStatValue}>{selectedWorker.hourly_rate}</div>
                  <div style={styles.modalStatLabel}>NOK/time</div>
                </div>
              </div>

              <div style={styles.modalInfo}>
                <div style={styles.modalInfoRow}>
                  <span style={styles.modalInfoLabel}>Yrke:</span>
                  <span style={styles.modalInfoValue}>{selectedWorker.profession}</span>
                </div>
                <div style={styles.modalInfoRow}>
                  <span style={styles.modalInfoLabel}>Match score:</span>
                  <span style={styles.modalInfoValue}>{selectedWorker.match_score}/170</span>
                </div>
                <div style={styles.modalInfoRow}>
                  <span style={styles.modalInfoLabel}>Status:</span>
                  <span style={{...styles.modalInfoValue, color: '#38a169'}}>Tilgjengelig</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    marginTop: '2rem',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#718096',
    margin: 0,
  },
  workersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  workerCard: {
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '1.25rem',
  },
  workerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    gap: '1rem',
  },
  workerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  workerAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: 'bold',
  },
  workerName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#2d3748',
  },
  workerUsername: {
    fontSize: '0.875rem',
    color: '#718096',
  },
  matchBadge: {
    padding: '0.25rem 0.75rem',
    background: '#d1fae5',
    color: '#065f46',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  workerDetails: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  detail: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#4a5568',
  },
  detailIcon: {
    fontSize: '1rem',
  },
  notificationPrefs: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    background: '#f0f9ff',
    borderRadius: '6px',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  notificationLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#4a5568',
    marginRight: '0.5rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem',
    color: '#4a5568',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    background: 'white',
    borderRadius: '4px',
    border: '1px solid #e2e8f0',
  },
  checkbox: {
    width: '14px',
    height: '14px',
    cursor: 'pointer',
  },
  checkboxIcon: {
    fontSize: '0.875rem',
  },
  workerFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0',
  },
  matchScore: {
    fontSize: '0.75rem',
    color: '#718096',
    fontWeight: '500',
  },
  viewProfileButton: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: '#667eea',
    border: '1px solid #667eea',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  notificationInfo: {
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
  placeholder: {
    padding: '2rem',
    textAlign: 'center',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '2px dashed #e2e8f0',
  },
  placeholderText: {
    color: '#718096',
    margin: 0,
  },
  loading: {
    padding: '2rem',
    textAlign: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem',
  },
  empty: {
    padding: '2rem',
    textAlign: 'center',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  emptyText: {
    color: '#4a5568',
    margin: '0 0 0.5rem 0',
  },
  emptyHint: {
    color: '#718096',
    fontSize: '0.75rem',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '400px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e2e8f0',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: '#718096',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
  },
  modalContent: {
    padding: '1.5rem',
  },
  modalProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  modalAvatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  modalName: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#2d3748',
  },
  modalUsername: {
    fontSize: '0.875rem',
    color: '#718096',
  },
  modalStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '1.5rem',
    padding: '1rem',
    background: '#f7fafc',
    borderRadius: '8px',
  },
  modalStat: {
    textAlign: 'center',
  },
  modalStatValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#2d3748',
  },
  modalStatLabel: {
    fontSize: '0.75rem',
    color: '#718096',
    marginTop: '0.25rem',
  },
  modalInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  modalInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #e2e8f0',
  },
  modalInfoLabel: {
    fontSize: '0.875rem',
    color: '#718096',
  },
  modalInfoValue: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#2d3748',
  },
};