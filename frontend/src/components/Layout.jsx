import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout({ navItems = [], children, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const roleName = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sidebar-header">
          HealthSync
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '0.5rem', background: 'none', WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'var(--text-muted)' }}>
            {roleName} Portal
          </div>
        </div>
        <nav className="nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              end={item.path.split('/').length <= 3}
            >
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="main-content">
        <header className="topbar">
          <div className="flex items-center gap-4">
            <span style={{ fontWeight: 500 }}>{title || `Welcome, ${user?.name || 'User'}`}</span>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Logout
            </button>
          </div>
        </header>
        <main className="content-area">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
