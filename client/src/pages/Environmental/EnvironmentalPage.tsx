import React, { useState } from 'react';

export const EnvironmentalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'factors' | 'log' | 'goals'>('factors');

  return (
    <div className="page-content">
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--env)' }}>
        🌿 Environmental Module
      </h1>
      
      <div className="tab-bar">
        <div 
          onClick={() => setActiveTab('factors')}
          className={`tab ${activeTab === 'factors' ? 'active' : ''}`}
          style={activeTab === 'factors' ? { borderBottomColor: 'var(--env)', color: 'var(--text-primary)' } : {}}
        >
          Emission Factors
        </div>
        <div 
          onClick={() => setActiveTab('log')}
          className={`tab ${activeTab === 'log' ? 'active' : ''}`}
          style={activeTab === 'log' ? { borderBottomColor: 'var(--env)', color: 'var(--text-primary)' } : {}}
        >
          Carbon Log
        </div>
        <div 
          onClick={() => setActiveTab('goals')}
          className={`tab ${activeTab === 'goals' ? 'active' : ''}`}
          style={activeTab === 'goals' ? { borderBottomColor: 'var(--env)', color: 'var(--text-primary)' } : {}}
        >
          Reduction Goals
        </div>
      </div>

      <div className="card">
        {activeTab === 'factors' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Emission Factors</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Factors seeded in database. API integration in progress by Aman.</p>
          </div>
        )}
        {activeTab === 'log' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Carbon Log</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Emissions transactions history list. API integration in progress.</p>
          </div>
        )}
        {activeTab === 'goals' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Reduction Goals</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Environmental goals tracking. API integration in progress.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default EnvironmentalPage;
