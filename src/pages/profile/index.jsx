import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../api/supabase';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState({
    upcomingShifts: 0,
    pendingApplications: 0,
    completedShifts: 0,
  });
  const [recentReviews, setRecentReviews] = useState([]);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    
    try {
      const userEmail = sessionStorage.getItem('user_email');
      console.log('Loading profile for email:', userEmail);
      
      if (!userEmail) {
        console.log('No user email in session');
        setLoading(false);
        return;
      }

      if (!supabase) {
        console.log('Supabase not configured - using mock data');
        // Set mock data for development
        setUser({
          name: 'Mock User',
          username: userEmail.split('@')[0],
          email: userEmail,
          role: 'worker',
          profession: 'Sykepleier',
          hprNumber: '1234567',
          hourlyRate: 450,
          averageRating: 4.5,
          totalReviews: 10,
          status: 'available',
          bio: 'Mock bruker for testing',
        });
        setLoading(false);
        return;
      }

      console.log('Fetching from Supabase...');

      // Fetch worker profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .eq('role', 'worker')
        .single();

      console.log('Profile data:', profileData);
      console.log('Profile error:', profileError);

      if (profileError) {
        console.error('Supabase error:', profileError);
        throw profileError;
      }

      if (profileData) {
        // Fetch worker-specific data using the profile ID
        const { data: workerData, error: workerError } = await supabase
          .from('workers')
          .select('*')
          .eq('id', profileData.id)
          .single();

        console.log('Worker data:', workerData);
        console.log('Worker error:', workerError);

        if (workerError) {
          console.error('Error fetching worker data:', workerError);
          throw workerError;
        }

        if (workerData) {
          setUser({
            name: profileData.full_name,
            username: profileData.username,
            email: profileData.email,
            role: profileData.role,
            profession: workerData.profession,
            hprNumber: workerData.hpr_number,
            hourlyRate: workerData.hourly_rate,
            averageRating: workerData.average_rating || 0,
            totalReviews: workerData.total_reviews || 0,
            status: workerData.status,
            bio: workerData.bio || 'Ingen beskrivelse lagt til ennå.',
          });

          // Fetch stats
          await loadStats(profileData.id);
          
          // Fetch recent reviews
          await loadRecentReviews(profileData.id);
        } else {
          console.log('No worker data found for this profile');
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Kunne ikke laste profil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (workerId) => {
    try {
      // Count upcoming shifts
      const { count: upcomingCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', workerId)
        .eq('status', 'active');

      // Count pending applications
      const { count: pendingCount } = await supabase
        .from('shift_applications')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', workerId)
        .eq('status', 'pending');

      // Count completed shifts
      const { count: completedCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', workerId)
        .eq('status', 'completed');

      setStats({
        upcomingShifts: upcomingCount || 0,
        pendingApplications: pendingCount || 0,
        completedShifts: completedCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentReviews = async (workerId) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          shifts!inner(
            departments!inner(
              municipality_name,
              department_name
            )
          )
        `)
        .eq('reviewee_id', workerId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <div style={styles.spinner}></div>
          <p>Laster profil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <p>Kunne ikke laste profil. Vennligst logg inn.</p>
          <Link to="/login" style={styles.loginButton}>Gå til innlogging</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Profile Header */}
      <div style={styles.header}>
        <div style={styles.profileInfo}>
          <div style={styles.avatar}>
            <span style={styles.avatarIcon}>👨‍⚕️</span>
          </div>
          <div>
            <h1 style={styles.name}>{user.name}</h1>
            <p style={styles.username}>@{user.username}</p>
            <div style={styles.badges}>
              <span style={styles.badge}>{user.profession}</span>
              <span style={{...styles.badge, ...styles.badgeSuccess}}>
                {user.status === 'available' ? 'Tilgjengelig' : 'Opptatt'}
              </span>
            </div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <Link to="/availability/post" style={styles.availabilityButton}>
            + Registrer tilgjengelighet
          </Link>
          <button style={styles.editButton} onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Avbryt' : 'Rediger profil'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⭐</div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{user.averageRating.toFixed(1)}</div>
            <div style={styles.statLabel}>Gjennomsnittsvurdering</div>
            <div style={styles.statSubtext}>{user.totalReviews} vurderinger</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{user.hourlyRate} NOK</div>
            <div style={styles.statLabel}>Timepris</div>
            <div style={styles.statSubtext}>per time</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📋</div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{stats.completedShifts}</div>
            <div style={styles.statLabel}>Fullførte vakter</div>
            <div style={styles.statSubtext}>totalt</div>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div style={styles.content}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Personlig informasjon</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Fullt navn</span>
              <span style={styles.infoValue}>{user.name}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>E-post</span>
              <span style={styles.infoValue}>{user.email}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>HPR-nummer</span>
              <span style={styles.infoValue}>{user.hprNumber}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Yrkeskategori</span>
              <span style={styles.infoValue}>{user.profession}</span>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Om meg</h2>
          <p style={styles.bio}>{user.bio}</p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Mine vakter</h2>
          <div style={styles.shiftsGrid}>
            <Link to="/dashboard" style={styles.shiftLink}>
              <div style={styles.shiftLinkIcon}>📅</div>
              <div>
                <div style={styles.shiftLinkTitle}>Kommende vakter</div>
                <div style={styles.shiftLinkDesc}>{stats.upcomingShifts} planlagte vakter</div>
              </div>
            </Link>
            <Link to="/dashboard" style={styles.shiftLink}>
              <div style={styles.shiftLinkIcon}>⏳</div>
              <div>
                <div style={styles.shiftLinkTitle}>Søknader</div>
                <div style={styles.shiftLinkDesc}>{stats.pendingApplications} ventende søknader</div>
              </div>
            </Link>
            <Link to="/dashboard" style={styles.shiftLink}>
              <div style={styles.shiftLinkIcon}>✅</div>
              <div>
                <div style={styles.shiftLinkTitle}>Historikk</div>
                <div style={styles.shiftLinkDesc}>{stats.completedShifts} fullførte vakter</div>
              </div>
            </Link>
          </div>
        </div>

        {recentReviews.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Siste vurderinger</h2>
            <div style={styles.reviewsList}>
              {recentReviews.map((review) => (
                <div key={review.id} style={styles.reviewCard}>
                  <div style={styles.reviewHeader}>
                    <div>
                      <div style={styles.reviewFrom}>
                        {review.shifts[0]?.departments[0]?.municipality_name} - {review.shifts[0]?.departments[0]?.department_name}
                      </div>
                      <div style={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString('nb-NO', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    <div style={styles.reviewRating}>
                      {'⭐'.repeat(review.rating)}
                    </div>
                  </div>
                  <p style={styles.reviewComment}>
                    "{review.comment}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem',
  },
  loadingState: {
    textAlign: 'center',
    padding: '4rem 2rem',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem',
  },
  errorState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    background: 'white',
    borderRadius: '12px',
  },
  loginButton: {
    display: 'inline-block',
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    background: '#667eea',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
  },
  header: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1.5rem',
  },
  profileInfo: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center',
  },
  avatar: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: '3rem',
  },
  name: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: '0 0 0.25rem 0',
  },
  username: {
    fontSize: '1rem',
    color: '#718096',
    margin: '0 0 0.75rem 0',
  },
  badges: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  badge: {
    padding: '0.25rem 0.75rem',
    background: '#e2e8f0',
    color: '#2d3748',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  badgeSuccess: {
    background: '#d1fae5',
    color: '#065f46',
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  availabilityButton: {
    padding: '0.75rem 1.5rem',
    background: '#38a169',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'inline-block',
  },
  editButton: {
    padding: '0.75rem 1.5rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  statCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  statIcon: {
    fontSize: '2.5rem',
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: '#2d3748',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#718096',
    marginTop: '0.25rem',
  },
  statSubtext: {
    fontSize: '0.75rem',
    color: '#a0aec0',
    marginTop: '0.125rem',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '1.5rem',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  infoLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#718096',
  },
  infoValue: {
    fontSize: '1rem',
    color: '#2d3748',
  },
  bio: {
    fontSize: '1rem',
    color: '#4a5568',
    lineHeight: '1.6',
    margin: 0,
  },
  shiftsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  shiftLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    background: '#f7fafc',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.2s',
    border: '1px solid #e2e8f0',
  },
  shiftLinkIcon: {
    fontSize: '2rem',
  },
  shiftLinkTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '0.25rem',
  },
  shiftLinkDesc: {
    fontSize: '0.875rem',
    color: '#718096',
  },
  reviewsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  reviewCard: {
    padding: '1.5rem',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    gap: '1rem',
  },
  reviewFrom: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#2d3748',
  },
  reviewDate: {
    fontSize: '0.75rem',
    color: '#718096',
    marginTop: '0.25rem',
  },
  reviewRating: {
    fontSize: '1.25rem',
    lineHeight: 1,
  },
  reviewComment: {
    fontSize: '0.875rem',
    color: '#4a5568',
    lineHeight: '1.6',
    margin: 0,
    fontStyle: 'italic',
  },
};