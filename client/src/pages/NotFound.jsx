import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export const NotFound = () => {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4)',
      textAlign: 'center'
    }}>
      <div className="card" style={{ maxWidth: '440px', padding: 'var(--space-8)' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'var(--wrong-bg)',
          color: 'var(--wrong)',
          marginBottom: 'var(--space-4)'
        }}>
          <AlertCircle size={28} />
        </div>
        <h1 className="serif-title" style={{ fontSize: '28px', marginBottom: 'var(--space-2)' }}>
          404 - Page Not Found
        </h1>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px', marginBottom: 'var(--space-6)' }}>
          The requested page could not be located. It may have moved or no longer exists.
        </p>
        <Link to="/" className="btn btn-primary" style={{ width: '100%' }}>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};
