import React from 'react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="page-content">
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: '1rem' }}>Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Welcome to the EcoSphere ESG Platform Dashboard.</p>
    </div>
  );
};
export default DashboardPage;
