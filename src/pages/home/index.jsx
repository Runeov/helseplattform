import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Fremtidens Helsebemanning
          </h1>
          <p style={styles.heroSubtitle}>
            Kobler kommuner direkte med kvalifisert helsepersonell
          </p>
          <div style={styles.heroStats}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>30%</div>
              <div style={styles.statLabel}>Lavere kostnader</div>
              <div style={styles.statDesc}>for kommunen</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>40%</div>
              <div style={styles.statLabel}>Høyere lønn</div>
              <div style={styles.statDesc}>for helsepersonell</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>100%</div>
              <div style={styles.statLabel}>Transparent</div>
              <div style={styles.statDesc}>ingen mellommenn</div>
            </div>
          </div>
          <div style={styles.heroCta}>
            <Link to="/register" style={styles.ctaButtonPrimary}>
              Kom i gang
            </Link>
            <Link to="/login" style={styles.ctaButtonSecondary}>
              Logg inn
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={styles.features}>
        <h2 style={styles.sectionTitle}>Hvordan det fungerer</h2>
        
        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🏛️</div>
            <h3 style={styles.featureTitle}>For kommuner</h3>
            <ul style={styles.featureList}>
              <li>Publiser ledige vakter direkte</li>
              <li>Se kvalifikasjoner og vurderinger</li>
              <li>Spar 30% på bemanningskostnader</li>
              <li>Ingen byråavgifter</li>
            </ul>
            <Link to="/register" style={styles.featureLink}>
              Registrer kommune →
            </Link>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>👨‍⚕️</div>
            <h3 style={styles.featureTitle}>For helsepersonell</h3>
            <ul style={styles.featureList}>
              <li>Velg dine egne vakter</li>
              <li>Opptil 40% høyere timelønn</li>
              <li>Fleksibel arbeidstid</li>
              <li>Direkte betaling</li>
            </ul>
            <Link to="/register" style={styles.featureLink}>
              Registrer deg →
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section style={styles.trust}>
        <h2 style={styles.sectionTitle}>Trygt og sikkert</h2>
        <div style={styles.trustGrid}>
          <div style={styles.trustItem}>
            <div style={styles.trustIcon}>🔐</div>
            <h4 style={styles.trustTitle}>ID-porten verifisering</h4>
            <p style={styles.trustText}>
              Alle brukere verifiseres med BankID eller Buypass
            </p>
          </div>
          <div style={styles.trustItem}>
            <div style={styles.trustIcon}>📋</div>
            <h4 style={styles.trustTitle}>HPR-validering</h4>
            <p style={styles.trustText}>
              Helsepersonell valideres mot Helsepersonellregisteret
            </p>
          </div>
          <div style={styles.trustItem}>
            <div style={styles.trustIcon}>⭐</div>
            <h4 style={styles.trustTitle}>Vurderingssystem</h4>
            <p style={styles.trustText}>
              Kvalitetssikring gjennom gjensidig vurdering
            </p>
          </div>
          <div style={styles.trustItem}>
            <div style={styles.trustIcon}>💬</div>
            <h4 style={styles.trustTitle}>Direkte kommunikasjon</h4>
            <p style={styles.trustText}>
              Chat direkte med arbeidsgiver eller arbeidstaker
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
  },
  hero: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '4rem 2rem',
    textAlign: 'center',
  },
  heroContent: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  heroTitle: {
    fontSize: '3rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    lineHeight: '1.2',
  },
  heroSubtitle: {
    fontSize: '1.5rem',
    marginBottom: '3rem',
    opacity: 0.95,
  },
  heroStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '2rem',
    marginBottom: '3rem',
  },
  statCard: {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '2rem',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  statNumber: {
    fontSize: '3rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  statLabel: {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '0.25rem',
  },
  statDesc: {
    fontSize: '0.875rem',
    opacity: 0.9,
  },
  heroCta: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  ctaButtonPrimary: {
    padding: '1rem 2.5rem',
    background: 'white',
    color: '#667eea',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1.125rem',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  ctaButtonSecondary: {
    padding: '1rem 2.5rem',
    background: 'transparent',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1.125rem',
    border: '2px solid white',
    transition: 'background 0.2s',
  },
  features: {
    padding: '4rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '3rem',
    color: '#2d3748',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
  },
  featureCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  featureTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '1rem',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 1.5rem 0',
    color: '#4a5568',
  },
  featureLink: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '1rem',
  },
  trust: {
    background: '#f7fafc',
    padding: '4rem 2rem',
  },
  trustGrid: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
  },
  trustItem: {
    textAlign: 'center',
  },
  trustIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  trustTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '0.5rem',
  },
  trustText: {
    color: '#4a5568',
    lineHeight: '1.6',
  },
};