import React, { useState } from 'react';
import useAuthStore from '../../store/authStore';

export const SocialPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'activities' | 'approvals' | 'diversity'>('activities');

  const showApprovals = user && (user.role === 'ADMIN' || user.role === 'MANAGER');

  return (
    <div className="page-content">
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--social)' }}>
        👥 Social Module
      </h1>
      
      <div className="tab-bar">
        <div 
          onClick={() => setActiveTab('activities')}
          className={`tab ${activeTab === 'activities' ? 'active' : ''}`}
          style={activeTab === 'activities' ? { borderBottomColor: 'var(--social)', color: 'var(--text-primary)' } : {}}
        >
          CSR Activities
        </div>
        {showApprovals && (
          <div 
            onClick={() => setActiveTab('approvals')}
            className={`tab ${activeTab === 'approvals' ? 'active' : ''}`}
            style={activeTab === 'approvals' ? { borderBottomColor: 'var(--social)', color: 'var(--text-primary)' } : {}}
          >
            Approval Queue
          </div>
        )}
        <div 
          onClick={() => setActiveTab('diversity')}
          className={`tab ${activeTab === 'diversity' ? 'active' : ''}`}
          style={activeTab === 'diversity' ? { borderBottomColor: 'var(--social)', color: 'var(--text-primary)' } : {}}
        >
          Diversity Metrics
        </div>
      </div>

      <div className="card">
        {activeTab === 'activities' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>CSR Activities</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Browse, sign up, and join community volunteer events. API integration in progress by Swapnil.</p>
          </div>
        )}
        {activeTab === 'approvals' && showApprovals && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Approval Queue</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Manager approval system for CSR hours and challenge completion proof files.</p>
          </div>
        )}
        {activeTab === 'diversity' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Diversity Dashboard</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Diversity metrics coming soon — integrated with human resources payroll module.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default SocialPage;
