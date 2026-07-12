import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Leaf, Users, Shield, Trophy, 
  FileBarChart, Settings, LogOut, ChevronDown, ChevronUp, Bell
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';

interface SidebarProps {
  toggleNotifications: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ toggleNotifications }) => {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();

  // Collapsible menu states
  const [envOpen, setEnvOpen] = useState(true);
  const [socialOpen, setSocialOpen] = useState(true);
  const [govOpen, setGovOpen] = useState(true);
  const [gamifyOpen, setGamifyOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Brand Logo */}
      <div style={{
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid var(--border)'
      }}>
        <Leaf style={{ color: 'var(--env)', width: '24px', height: '24px' }} />
        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, letterSpacing: '-0.025em' }}>
          EcoSphere
        </span>
      </div>

      {/* Navigation List */}
      <div style={{ flex: 1, padding: '1rem 0' }}>
        <ul style={{ listStyle: 'none' }}>
          {/* Dashboard Link */}
          <li>
            <NavLink 
              to="/" 
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1.5rem',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: isActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--text-primary)' : '3px solid transparent',
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 600 : 500
              })}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
          </li>

          <div style={{ height: '1px', background: 'var(--border)', margin: '0.75rem 0' }}></div>

          {/* Environmental Section */}
          <li>
            <div 
              onClick={() => setEnvOpen(!envOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                color: 'var(--env)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Leaf size={18} />
                <span>Environmental</span>
              </div>
              {envOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            {envOpen && (
              <ul style={{ listStyle: 'none', paddingLeft: '1.5rem' }}>
                <li>
                  <NavLink 
                    to="/environmental/factors"
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '0.5rem 1.5rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500
                    })}
                  >
                    Emission Factors
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/environmental/transactions"
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '0.5rem 1.5rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500
                    })}
                  >
                    Carbon Log
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/environmental/goals"
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '0.5rem 1.5rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500
                    })}
                  >
                    Reduction Goals
                  </NavLink>
                </li>
              </ul>
            )}
          </li>

          {/* Social Section */}
          <li>
            <div 
              onClick={() => setSocialOpen(!socialOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                color: 'var(--social)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={18} />
                <span>Social</span>
              </div>
              {socialOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            {socialOpen && (
              <ul style={{ listStyle: 'none', paddingLeft: '1.5rem' }}>
                <li>
                  <NavLink 
                    to="/social/activities"
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '0.5rem 1.5rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500
                    })}
                  >
                    CSR Activities
                  </NavLink>
                </li>
                {user && (user.role === 'ADMIN' || user.role === 'MANAGER') && (
                  <li>
                    <NavLink 
                      to="/social/approvals"
                      style={({ isActive }) => ({
                        display: 'block',
                        padding: '0.5rem 1.5rem',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: isActive ? 600 : 500
                      })}
                    >
                      Approval Queue
                    </NavLink>
                  </li>
                )}
              </ul>
            )}
          </li>

          {/* Governance Section */}
          <li>
            <div 
              onClick={() => setGovOpen(!govOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                color: 'var(--gov)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield size={18} />
                <span>Governance</span>
              </div>
              {govOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            {govOpen && (
              <ul style={{ listStyle: 'none', paddingLeft: '1.5rem' }}>
                <li>
                  <NavLink 
                    to="/governance/policies"
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '0.5rem 1.5rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500
                    })}
                  >
                    Policies
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/governance/audits"
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '0.5rem 1.5rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500
                    })}
                  >
                    Audits
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/governance/issues"
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '0.5rem 1.5rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500
                    })}
                  >
                    Compliance Issues
                  </NavLink>
                </li>
              </ul>
            )}
          </li>

          {/* Gamification Section */}
          <li>
            <div 
              onClick={() => setGamifyOpen(!gamifyOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                color: 'var(--gamify)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Trophy size={18} />
                <span>Gamification</span>
              </div>
              {gamifyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            {gamifyOpen && (
              <ul style={{ listStyle: 'none', paddingLeft: '1.5rem' }}>
                <li>
                  <NavLink 
                    to="/gamification/challenges"
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '0.5rem 1.5rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500
                    })}
                  >
                    Challenges
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/gamification/badges"
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '0.5rem 1.5rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500
                    })}
                  >
                    My Badges
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/gamification/rewards"
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '0.5rem 1.5rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500
                    })}
                  >
                    Reward Shop
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/gamification/leaderboard"
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: '0.5rem 1.5rem',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500
                    })}
                  >
                    Live Leaderboard
                  </NavLink>
                </li>
              </ul>
            )}
          </li>

          <div style={{ height: '1px', background: 'var(--border)', margin: '0.75rem 0' }}></div>

          {/* Reports Link */}
          <li>
            <NavLink 
              to="/reports" 
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1.5rem',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: isActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--insight)' : '3px solid transparent',
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 600 : 500
              })}
            >
              <FileBarChart size={18} />
              <span>Reports</span>
            </NavLink>
          </li>

          {/* Settings Link */}
          <li>
            <NavLink 
              to="/settings" 
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1.5rem',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: isActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--text-muted)' : '3px solid transparent',
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 600 : 500
              })}
            >
              <Settings size={18} />
              <span>Settings</span>
            </NavLink>
          </li>

          {/* Notifications Trigger Link */}
          <li>
            <div 
              onClick={toggleNotifications}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Bell size={18} />
                <span>Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span style={{
                  background: 'var(--severity-high)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '2px 6px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
          </li>
        </ul>
      </div>

      {/* User Footer Profile */}
      {user && (
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className="badge badge--active" style={{ fontSize: '10px', padding: '1px 6px' }}>
                {user.role}
              </span>
              <span style={{ color: 'var(--gamify)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                🏆 {user.xp} XP
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="btn btn-secondary" 
            style={{ width: '100%', padding: '0.375rem 0.75rem', fontSize: 'var(--text-xs)' }}
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      )}
    </aside>
  );
};
export default Sidebar;
