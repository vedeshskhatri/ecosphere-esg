import React, { useState } from 'react';

export const GamificationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'challenges' | 'badges' | 'rewards' | 'leaderboard'>('challenges');

  return (
    <div className="page-content">
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--gamify)' }}>
        🏆 Gamification Module
      </h1>
      
      <div className="tab-bar">
        <div 
          onClick={() => setActiveTab('challenges')}
          className={`tab ${activeTab === 'challenges' ? 'active' : ''}`}
          style={activeTab === 'challenges' ? { borderBottomColor: 'var(--gamify)', color: 'var(--text-primary)' } : {}}
        >
          Challenges
        </div>
        <div 
          onClick={() => setActiveTab('badges')}
          className={`tab ${activeTab === 'badges' ? 'active' : ''}`}
          style={activeTab === 'badges' ? { borderBottomColor: 'var(--gamify)', color: 'var(--text-primary)' } : {}}
        >
          Badges
        </div>
        <div 
          onClick={() => setActiveTab('rewards')}
          className={`tab ${activeTab === 'rewards' ? 'active' : ''}`}
          style={activeTab === 'rewards' ? { borderBottomColor: 'var(--gamify)', color: 'var(--text-primary)' } : {}}
        >
          Reward Shop
        </div>
        <div 
          onClick={() => setActiveTab('leaderboard')}
          className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          style={activeTab === 'leaderboard' ? { borderBottomColor: 'var(--gamify)', color: 'var(--text-primary)' } : {}}
        >
          Leaderboard
        </div>
      </div>

      <div className="card">
        {activeTab === 'challenges' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Active Challenges</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Complete eco-friendly tasks to earn high points and XP. API integration in progress by Swapnil.</p>
          </div>
        )}
        {activeTab === 'badges' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>My Badges</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>View earned badges and unlock rules.</p>
          </div>
        )}
        {activeTab === 'rewards' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Reward Shop</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Redeem collected points for eco-friendly products and paid time off. Concurrency-safe transactions in progress.</p>
          </div>
        )}
        {activeTab === 'leaderboard' && (
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.75rem' }}>Live Leaderboard</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Live ranking of employees based on accrued XP points. Updates automatically over websockets.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default GamificationPage;
