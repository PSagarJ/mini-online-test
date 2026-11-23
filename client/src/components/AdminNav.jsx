import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, School, BookOpen, BarChart3 } from 'lucide-react';

export const AdminNav = () => {
  const linkStyle = ({ isActive }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: isActive ? 600 : 500,
    backgroundColor: isActive ? 'var(--surface)' : 'transparent',
    color: isActive ? 'var(--accent)' : 'var(--muted-text)',
    border: isActive ? 'var(--border-hairline)' : '1px solid transparent',
    textDecoration: 'none',
    transition: 'all var(--transition-speed) var(--transition-ease)'
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      marginBottom: 'var(--space-6)',
      padding: '4px',
      backgroundColor: 'rgba(27, 26, 23, 0.04)',
      borderRadius: 'var(--radius-sm)',
      width: 'fit-content'
    }}>
      <NavLink to="/admin/users" style={linkStyle}>
        <Users size={15} />
        <span>Users</span>
      </NavLink>
      <NavLink to="/admin/classes" style={linkStyle}>
        <School size={15} />
        <span>Classes</span>
      </NavLink>
      <NavLink to="/admin/banks" style={linkStyle}>
        <BookOpen size={15} />
        <span>Question Banks</span>
      </NavLink>
      <NavLink to="/admin/results" style={linkStyle}>
        <BarChart3 size={15} />
        <span>Assessment Results</span>
      </NavLink>
    </div>
  );
};
