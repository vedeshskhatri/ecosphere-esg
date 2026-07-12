import React from 'react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="page-content">
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
        ⚙️ Settings
      </h1>
      <div className="card">
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Esg Configuration</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Manage organizational settings and configure module weights.</p>
      </div>
    </div>
  );
};
export default SettingsPage;
