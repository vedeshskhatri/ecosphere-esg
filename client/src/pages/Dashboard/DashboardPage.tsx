import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import ScoreRing from '../../components/ScoreRing';
import { socket } from '../../lib/socket';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Count-up helper component for animating 0 -> target value using requestAnimationFrame over 1.5s
const CountUp: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1500 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(value);
      }
    };
    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
};

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<any>(null);
  const [emissionsTrend, setEmissionsTrend] = useState<any[]>([]);
  const [departmentScores, setDepartmentScores] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      if (response.data?.success) {
        const {
          scores: resScores,
          emissionsTrend: resEmissions,
          departmentScores: resDepts,
          activityFeed: resFeed,
          insights: resInsights,
          impactFactors,
          stats: resStats
        } = response.data.data;

        setScores(resScores);
        setEmissionsTrend(resEmissions || []);
        setDepartmentScores(resDepts || []);
        setActivityFeed(resFeed || []);
        setInsights(resInsights || []);
        setStats(resStats || null);
        console.log('[Dashboard] Loaded impact factors:', impactFactors);
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Socket Connection State
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setIsConnected(socket.connected);

    // Socket Event Bus Listeners
    const handleScoreUpdate = () => {
      fetchDashboard();
    };

    const handleActivityFeed = (newActivity: any) => {
      setActivityFeed(prev => [newActivity, ...prev]);
    };

    socket.on('score:update', handleScoreUpdate);
    socket.on('activity:feed', handleActivityFeed);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('score:update', handleScoreUpdate);
      socket.off('activity:feed', handleActivityFeed);
    };
  }, []);

  // Format Activity Feed Items
  const formatActivityItem = (item: any) => {
    if (item.message) {
      return {
        id: item.id || Math.random().toString(),
        type: item.type,
        title: item.title || 'Platform Notification',
        message: item.message,
        createdAt: item.createdAt || new Date().toISOString()
      };
    }

    // Direct Socket Fallbacks
    let message = '';
    let title = 'Platform Event';
    const empName = item.employeeName || item.userName || 'A user';

    if (item.type === 'CSR_APPROVED') {
      title = 'CSR Activity Completed';
      message = `${empName} completed the CSR activity "${item.activityTitle || 'CSR Activity'}"!`;
    } else if (item.type === 'CHALLENGE_APPROVED') {
      title = 'Challenge Approved';
      message = `${empName} completed the challenge "${item.challengeTitle || 'Challenge'}"!`;
    } else if (item.type === 'BADGE_UNLOCKED' || item.type === 'BADGE_UNLOCK') {
      title = 'Badge Unlocked';
      message = `${empName} unlocked the badge "${item.badgeName || 'Badge'}"!`;
    } else if (item.type === 'REWARD_REDEEMED') {
      title = 'Reward Redeemed';
      message = `${empName} redeemed "${item.rewardName || 'Reward'}"!`;
    } else {
      message = JSON.stringify(item);
    }

    return {
      id: Math.random().toString(),
      type: item.type,
      title,
      message,
      createdAt: new Date().toISOString()
    };
  };

  // Activity Dot Color Mapper
  const getDotColor = (item: any) => {
    const type = item.type || '';
    const msg = (item.message || '').toUpperCase();
    if (type.includes('APPROVED') || msg.includes('APPROVED')) return '#22c55e'; // Green
    if (type.includes('REJECTED') || type.includes('ISSUE') || msg.includes('REJECTED') || msg.includes('OVERDUE')) return '#ef4444'; // Red
    if (type.includes('BADGE') || msg.includes('BADGE')) return '#f59e0b'; // Amber
    return '#3b82f6'; // Default Blue
  };

  // Safe Math Computations
  const totalCo2Val = stats?.totalCo2 ?? (emissionsTrend?.reduce((acc: number, item: any) => acc + (item.totalCo2 || 0), 0) || 0);
  const totalXpVal = stats?.totalXp ?? stats?.totalXP ?? 0;

  const treesSaved = parseFloat((totalCo2Val * 0.0167).toFixed(0));
  const flights = parseFloat((totalCo2Val / 900).toFixed(0));
  const volunteerHours = parseFloat((totalXpVal * 0.1).toFixed(0));

  const formattedDeptScores = departmentScores.map(dept => ({
    name: dept.departmentName,
    'Env Score': dept.envScore ?? dept.score,
    'Gov Score': dept.govScore ?? dept.score,
    'Social Score': dept.socialScore ?? dept.score
  }));

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  } as const;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  } as const;

  // Shimmer Loader Skeletons
  if (loading) {
    return (
      <div className="dashboard-container" style={{ padding: '1.5rem', background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="shimmer" style={{ width: '220px', height: '2rem', borderRadius: '4px', marginBottom: '0.5rem' }} />
            <div className="shimmer" style={{ width: '380px', height: '1rem', borderRadius: '4px' }} />
          </div>
          <div className="shimmer" style={{ width: '220px', height: '2.25rem', borderRadius: '999px' }} />
        </div>

        {/* 4 Score Rings Skeleton Grid */}
        <div className="dashboard-score-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', padding: '1.5rem' }}>
              <div className="shimmer" style={{ width: i === 3 ? '140px' : '120px', height: i === 3 ? '140px' : '120px', borderRadius: '50%', marginBottom: '1rem' }} />
              <div className="shimmer" style={{ width: '100px', height: '1rem', borderRadius: '4px' }} />
            </div>
          ))}
        </div>

        {/* Charts Skeleton Grid */}
        <div className="dashboard-charts-grid">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card" style={{ height: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="shimmer" style={{ width: '280px', height: '1.5rem', borderRadius: '4px' }} />
              <div className="shimmer" style={{ flex: 1, borderRadius: '8px' }} />
            </div>
          ))}
        </div>

        <style>{`
          .dashboard-score-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            margin-top: 1.5rem;
          }
          .dashboard-charts-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
            margin-top: 1.5rem;
          }
          .shimmer {
            background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.03) 75%);
            background-size: 200% 100%;
            animation: shimmer-anim 1.5s infinite;
          }
          @keyframes shimmer-anim {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @media (max-width: 768px) {
            .dashboard-score-grid {
              grid-template-columns: repeat(2, 1fr);
            }
            .dashboard-charts-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    );
  }

  // Active Score Fallbacks
  const environmentalScore = scores?.environmental ?? scores?.env ?? 0;
  const socialScore = scores?.social ?? 0;
  const governanceScore = scores?.governance ?? scores?.gov ?? 0;
  const overallScore = scores?.overall ?? scores?.total ?? 0;

  return (
    <motion.div
      className="dashboard-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{
        padding: '1.5rem',
        background: 'var(--bg-primary)',
        minHeight: '100vh',
        width: '100%'
      }}
    >
      {/* Dynamic Grid Styles Block */}
      <style>{`
        .dashboard-score-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .dashboard-charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        .dashboard-bottom-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        .live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot-green {
          background-color: #22c55e;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
        }
        .dot-red {
          background-color: #ef4444;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
        @media (max-width: 1024px) {
          .dashboard-bottom-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .dashboard-score-grid {
            grid-template-columns: repeat(2, 2fr);
          }
          .dashboard-charts-grid {
            grid-template-columns: 1fr;
          }
          .dashboard-bottom-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Section 1 — Header */}
      <motion.div
        variants={cardVariants}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Platform Overview
            </h1>
            <span
              className={`dot ${isConnected ? 'dot-green' : 'dot-red'}`}
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isConnected ? '#22c55e' : '#ef4444',
                boxShadow: isConnected ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
                marginTop: '4px',
              }}
            />
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Real-time ESG intelligence and gamified compliance tracking.
          </p>
        </div>
      </motion.div>

      {/* Section 2 — Score Rings */}
      <div className="dashboard-score-grid">
        <motion.div className="card" variants={cardVariants} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '220px' }}>
          <ScoreRing value={environmentalScore} color="#22c55e" label="Environmental" />
        </motion.div>
        <motion.div className="card" variants={cardVariants} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '220px' }}>
          <ScoreRing value={socialScore} color="#3b82f6" label="Social" />
        </motion.div>
        <motion.div className="card" variants={cardVariants} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '220px' }}>
          <ScoreRing value={governanceScore} color="#a855f7" label="Governance" />
        </motion.div>
        <motion.div className="card" variants={cardVariants} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '220px' }}>
          <ScoreRing value={overallScore} color="#f1f5f9" label="Overall ESG" size={140} />
        </motion.div>
      </div>

      {/* Section 3 — Charts row */}
      <div className="dashboard-charts-grid">
        {/* Left card: LineChart */}
        <motion.div className="card" variants={cardVariants} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            📈 12-Month CO₂ Emissions Trend
          </h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={emissionsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(25,53,12,0.08)" />
                <XAxis dataKey="month" tick={{ fill: '#687D31', fontSize: 12 }} />
                <YAxis tick={{ fill: '#687D31', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid rgba(25,53,12,0.12)',
                    borderRadius: 8,
                    color: '#19350C'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalCo2"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Right card: BarChart */}
        <motion.div className="card" variants={cardVariants} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            🏢 Department ESG Ranking
          </h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedDeptScores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(25,53,12,0.08)" />
                <XAxis dataKey="name" tick={{ fill: '#687D31', fontSize: 12 }} />
                <YAxis tick={{ fill: '#687D31', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid rgba(25,53,12,0.12)',
                    borderRadius: 8,
                    color: '#19350C'
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
                <Bar dataKey="Env Score" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Social Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gov Score" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Section 4 — Bottom row */}
      <div className="dashboard-bottom-grid">
        {/* Left Card — Real-World Impact */}
        <motion.div className="card" variants={cardVariants} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            🌍 Real-World Impact
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
            {/* Row 1: Trees Saved */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(25,53,12,0.04)', borderRadius: '10px', border: '1px solid rgba(25,53,12,0.08)' }}>
              <span style={{ fontSize: '1.75rem' }}>🌳</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  <CountUp value={treesSaved} />
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Trees saved / offset equivalent</span>
              </div>
            </div>

            {/* Row 2: Flights Avoided */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(25,53,12,0.04)', borderRadius: '10px', border: '1px solid rgba(25,53,12,0.08)' }}>
              <span style={{ fontSize: '1.75rem' }}>✈️</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  <CountUp value={flights} />
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Flights avoided equivalence</span>
              </div>
            </div>

            {/* Row 3: Volunteer Hours */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(25,53,12,0.04)', borderRadius: '10px', border: '1px solid rgba(25,53,12,0.08)' }}>
              <span style={{ fontSize: '1.75rem' }}>🕐</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  <CountUp value={volunteerHours} />
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Volunteer hours completed</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Middle Card — Smart ESG Insights */}
        <motion.div className="card" variants={cardVariants} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            💡 Smart ESG Insights
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', maxHeight: '280px', paddingRight: '4px' }}>
            {insights.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No active insights.
              </div>
            ) : (
              insights.map((insight, idx) => (
                <div
                  key={insight.id || idx}
                  style={{
                    background: 'rgba(6,182,212,0.1)',
                    border: '1px solid rgba(6,182,212,0.2)',
                    color: '#06b6d4',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.4'
                  }}
                >
                  {insight.message}
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Right Card — Live Activity Feed */}
        <motion.div className="card" variants={cardVariants} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            ⚡ Live Activity Feed
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: '280px', flex: 1, paddingRight: '4px' }}>
            {activityFeed.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Waiting for platform events...
              </div>
            ) : (
              activityFeed.map((rawItem, index) => {
                const item = formatActivityItem(rawItem);
                const dotColor = getDotColor(item);
                return (
                  <div
                    key={item.id || index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      fontSize: 'var(--text-sm)',
                      paddingBottom: '0.75rem',
                      borderBottom: '1px solid rgba(255,255,255,0.02)',
                      marginBottom: '0.75rem'
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: dotColor,
                        marginTop: '6px',
                        flexShrink: 0
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {item.message}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
