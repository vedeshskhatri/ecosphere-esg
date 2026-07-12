import React from 'react';

export const ReportsPage: React.FC = () => {
  return (
    <div className="page-content">
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--insight)' }}>
        📊 Reports
      </h1>
      <div className="card">
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Corporate ESG Reporting</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Download reports in CSV format and build custom queries. API integration in progress by Aman.</p>
      </div>
    </div>
  );
};
export default ReportsPage;
