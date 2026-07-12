import React, { useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEsgStore } from '../../store/esgStore';
import { ScoreRing } from '../../components/ScoreRing';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { Leaf, Shield, Activity, ShieldAlert, Sparkles, Plane, Clock } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    orgScores, departmentScores, insights, activityFeed,
    transactions, fetchDashboardData, fetchEnvironmentalData, fetchGamificationData 
  } = useEsgStore();

  useEffect(() => {
    fetchDashboardData();
    fetchEnvironmentalData(); // Fetch transactions for line chart
    fetchGamificationData(user?.role);  // Fetch leaderboard for additional stats
  }, [fetchDashboardData, fetchEnvironmentalData, fetchGamificationData, user?.role]);

  // 1. Group Carbon Transactions by Month for Line Chart
  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    const monthlyData: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize past 12 months with 0
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthlyData[key] = 0;
    }

    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (key in monthlyData) {
        monthlyData[key] += Number(tx.co2Kg);
      }
    });

    return Object.entries(monthlyData).map(([name, co2]) => ({
      name,
      'CO₂ (kg)': parseFloat(co2.toFixed(1)),
    }));
  }, [transactions]);

  // 2. Format Bar Chart Data (Department Scores)
  const barChartData = useMemo(() => {
    return departmentScores.map((ds) => ({
      name: ds.name || ds.department?.name,
      'Env Score': Number(ds.envScore),
      'Social Score': Number(ds.socialScore),
      'Gov Score': Number(ds.govScore),
      'Total Score': Number(ds.totalScore),
    }));
  }, [departmentScores]);

  // 3. Real World Impact calculations
  const totalCo2 = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + Number(tx.co2Kg), 0);
  }, [transactions]);

  const treesSaved = Math.round(totalCo2 * 0.04);
  const flightsAvoided = Math.round(totalCo2 * 0.005);
  const volunteerHours = Math.round((user?.xp || 0) * 0.1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Platform Overview
          </h1>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Real-time ESG intelligence and gamified compliance tracking.
          </span>
        </div>
        <div className="badge badge--active" style={{ padding: '0.5rem 1rem' }}>
          <Activity size={14} style={{ marginRight: '4px' }} />
          <span>Live event bus connected</span>
        </div>
      </div>

      {/* 4 Score Rings Grid */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem', justifyContent: 'center' }}>
        <ScoreRing value={orgScores.totalScore} color="var(--text-primary)" label="Overall ESG Score" />
        <ScoreRing value={orgScores.envScore} color="var(--env)" label="Environmental" />
        <ScoreRing value={orgScores.socialScore} color="var(--social)" label="Social" />
        <ScoreRing value={orgScores.govScore} color="var(--gov)" label="Governance" />
      </div>

      {/* Double Column Chart Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
        {/* Line Chart */}
        <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Leaf size={18} color="var(--env)" /> 12-Month CO₂ Emissions Trend
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '6px' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="CO₂ (kg)" stroke="var(--env)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--gov)" /> Department ESG Comparison
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '6px' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Env Score" fill="var(--env-dim)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Social Score" fill="var(--social-dim)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gov Score" fill="var(--gov-dim)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Insights, Impact & Activity Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Real World Impact Translator */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--gamify)" /> Real-World Impact Translator
          </h3>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Converting data points into tangible ecological equivalents.
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(34,197,94,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(34,197,94,0.1)' }}>
              <Leaf size={28} color="var(--env)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: '700', color: 'var(--text-primary)' }}>{treesSaved} Trees</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>CO₂ offset equivalence saved</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(59,130,246,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59,130,246,0.1)' }}>
              <Plane size={28} color="var(--social)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: '700', color: 'var(--text-primary)' }}>{flightsAvoided} Flights</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Long-haul business flights avoided</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(249,115,22,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(249,115,22,0.1)' }}>
              <Clock size={28} color="var(--gamify)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: '700', color: 'var(--text-primary)' }}>{volunteerHours} Hours</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Community volunteer impact logged</span>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Insights & Warnings */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="var(--insight)" /> Smart ESG Insights
          </h3>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Automated intelligence auditing department thresholds.
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto', maxHeight: '220px' }}>
            {insights.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
                No active anomalies flagged. System stable.
              </div>
            ) : (
              insights.map((insight) => (
                <div key={insight.id} style={{
                  padding: '0.875rem',
                  backgroundColor: 'rgba(6,182,212,0.06)',
                  border: '1px solid rgba(6,182,212,0.18)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  lineHeight: '1.4',
                  color: 'var(--text-primary)'
                }}>
                  {insight.message}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--text-primary)" /> Live Activity Feed
          </h3>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Real-time event broadcasts from the platform.
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto', maxHeight: '220px' }}>
            {activityFeed.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
                Waiting for platform events...
              </div>
            ) : (
              activityFeed.map((activity, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: 'var(--text-xs)',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid rgba(255,255,255,0.02)'
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    [{new Date(activity.timestamp).toLocaleTimeString()}]
                  </span>
                  <span>{activity.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
