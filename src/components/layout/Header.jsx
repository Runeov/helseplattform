import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  
  useEffect(() => {
    // Get logged-in user from session storage
    const userEmail = sessionStorage.getItem('user_email');
    const userRole = sessionStorage.getItem('user_role');
    const userName = sessionStorage.getItem('user_name');
    
    if (userEmail && userRole) {
      // Extract username from email (e.g., user1@test.no -> user1)
      const username = userEmail.split('@')[0];
      setCurrentUser({
        username,
        role: userRole,
        name: userName || username,
      });
    }
  }, [location]); // Re-check on route change
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const getUserIcon = () => {
    if (!currentUser) return null;
    return currentUser.role === 'employer' ? '🏛️' : '👨‍⚕️';
  };

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <Link to="/" style={styles.logoLink}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🏥</span>
            <span style={styles.logoText}>HelsePlattform</span>
          </div>
        </Link>
        
        <div style={styles.rightSection}>
          {/* Current User Display */}
          {currentUser && (
            <div style={styles.userDisplay}>
              <span style={styles.userIcon}>{getUserIcon()}</span>
              <span style={styles.userName}>@{currentUser.username}</span>
            </div>
          )}

          <nav style={styles.nav}>
            <Link 
              to="/" 
              style={{
                ...styles.navLink,
                ...(isActive('/') ? styles.navLinkActive : {})
              }}
            >
              Hjem
            </Link>
            <Link 
              to="/dashboard" 
              style={{
                ...styles.navLink,
                ...(isActive('/dashboard') ? styles.navLinkActive : {})
              }}
            >
              Vakt-oversikt
            </Link>
            {!currentUser && (
              <>
                <Link 
                  to="/register" 
                  style={{
                    ...styles.navLink,
                    ...styles.navLinkRegister,
                    ...(isActive('/register') ? styles.navLinkActive : {})
                  }}
                >
                  Registrer
                </Link>
                <Link 
                  to="/login" 
                  style={{
                    ...styles.navLink,
                    ...styles.navLinkLogin,
                    ...(isActive('/login') ? styles.navLinkActive : {})
                  }}
                >
                  Logg inn
                </Link>
              </>
            )}
            {currentUser && (
              <button
                style={styles.logoutButton}
                onClick={() => {
                  sessionStorage.clear();
                  window.location.href = '/';
                }}
              >
                Logg ut
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    background: 'white',
    borderBottom: '2px solid #e2e8f0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoLink: {
    textDecoration: 'none',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  logoIcon: {
    fontSize: '1.75rem',
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  userDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#2d3748',
  },
  userIcon: {
    fontSize: '1.25rem',
  },
  userName: {
    color: '#667eea',
    fontWeight: '600',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  navLink: {
    padding: '0.5rem 1rem',
    textDecoration: 'none',
    color: '#4a5568',
    fontWeight: '500',
    borderRadius: '6px',
    transition: 'all 0.2s',
    fontSize: '0.95rem',
  },
  navLinkActive: {
    color: '#667eea',
    background: '#f7fafc',
  },
  navLinkRegister: {
    background: '#667eea',
    color: 'white',
  },
  navLinkLogin: {
    border: '2px solid #667eea',
    color: '#667eea',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: '#e53e3e',
    border: '1px solid #e53e3e',
    borderRadius: '6px',
    fontWeight: '500',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};