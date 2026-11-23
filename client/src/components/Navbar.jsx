import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, LogOut, Menu, X, Shield } from 'lucide-react';

export const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkStyle = ({ isActive }) => ({
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    color: isActive ? 'var(--accent)' : 'var(--ink)',
    fontWeight: isActive ? 600 : 500,
    backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color var(--transition-speed) var(--transition-ease)'
  });

  return (
    <header style={{
      backgroundColor: 'var(--surface)',
      borderBottom: 'var(--border-hairline)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px'
      }}>
        {/* Wordmark */}
        <NavLink to="/" className="wordmark" style={{ textDecoration: 'none' }}>
          <GraduationCap size={24} color="var(--accent)" />
          <span>Examiner</span>
        </NavLink>

        {/* Desktop Navigation */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }} className="desktop-nav">
          <NavLink to="/" style={navLinkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/history" style={navLinkStyle}>
            History
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/users" style={navLinkStyle}>
              <Shield size={16} />
              Admin
            </NavLink>
          )}
        </nav>

        {/* User Info & Logout Desktop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }} className="desktop-nav">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', lineHeight: 1.2 }}>{user?.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>
              {user?.isMainAdmin ? 'Main Admin' : user?.className || (user?.role === 'admin' ? 'Administrator' : 'Student')}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn"
            style={{ padding: '6px 12px', minHeight: '36px', fontSize: '13px' }}
            title="Log out"
          >
            <LogOut size={15} />
            <span>Log out</span>
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="btn mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          style={{ padding: '8px', minHeight: '40px', width: '40px' }}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: 'var(--surface)',
          borderBottom: 'var(--border-hairline)',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)'
        }} className="mobile-drawer">
          <div style={{ padding: 'var(--space-2) 0', borderBottom: 'var(--border-hairline)', marginBottom: 'var(--space-2)' }}>
            <div style={{ fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>
              {user?.isMainAdmin ? 'Main Admin' : user?.className || (user?.role === 'admin' ? 'Administrator' : 'Student')}
            </div>
          </div>
          <NavLink to="/" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink to="/history" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
            History
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/users" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
              Admin Panel
            </NavLink>
          )}
          <button
            onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
            className="btn"
            style={{ marginTop: 'var(--space-2)', justifyContent: 'flex-start' }}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-toggle {
            display: inline-flex !important;
          }
        }
        @media (min-width: 641px) {
          .mobile-toggle {
            display: none !important;
          }
          .mobile-drawer {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
