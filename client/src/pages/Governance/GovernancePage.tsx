import React, { useState } from 'react';

export const GovernancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'policies' | 'audits' | 'issues'>('policies');

  return (
    <div className="page-content">
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--gov)' }}>
        🛡️ Governance Module
      </h1>
      
      <div className="tab-bar">
        <div 
          onClick={() => setActiveTab('policies')}
          className={`tab ${activeTab === 'policies' ? 'active' : ''}`}
          style={activeTab === 'policies' ? { borderBottomColor: 'var(--gov)', color: 'var(--text-primary)' } : {}}
        >
          Policies
        </div>
        <div 
          onClick={() => setActiveTab('audits')}
          className={`tab ${activeTab === 'audits' ? 'active' : ''}`}
          style={activeTab === 'audits' ? { borderBottomColor: 'var(--gov)', color: 'var(--text-primary)' } : {}}
        >
          Audits
        </div>
        <div 
          onClick={() => setActiveTab('issues')}
          className={`tab ${activeTab === 'issues' ? 'active' : ''}`}
          style={activeTab === 'issues' ? { borderBottomColor: 'var(--gov)', color: 'var(--text-primary)' } : {}}
        >
          Compliance Issues
        </div>
      </div>

      <div className="card">
        {activeTab === 'policies' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Policies</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Read and acknowledge active compliance policies. API integration in progress.</p>
          </div>
        )}
        {activeTab === 'audits' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Audits</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Track scheduled ESG Audits and findings.</p>
          </div>
        )}
        {activeTab === 'issues' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Compliance Issues</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>View assigned high-severity compliance alerts and track resolution SLA.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default GovernancePage;
