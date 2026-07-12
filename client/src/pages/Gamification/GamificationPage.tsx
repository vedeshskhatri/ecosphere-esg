import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { socket } from '../../lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Star, Gift, Users, Plus, CheckCircle, XCircle, Zap, Lock, Crown,
  Clock, Upload, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Challenge {
  id: string;
  title: string;
  categoryId: string;
  description: string;
  xp: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  evidenceRequired: boolean;
  deadline: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'UNDER_REVIEW' | 'COMPLETED' | 'ARCHIVED';
  category?: { name: string };
  joinStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  participantsCount?: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockRuleType: 'XP_THRESHOLD' | 'CHALLENGE_COUNT' | 'CSR_COUNT';
  unlockRuleValue: number;
  earned?: boolean;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  stock: number;
  status: 'ACTIVE' | 'INACTIVE';
}

interface LeaderboardItem {
  id: string;
  name: string;
  departmentId: string | null;
  xp: number;
  pointsBalance: number;
  badgeCount: number;
}

interface Category {
  id: string;
  name: string;
  type: 'CSR_ACTIVITY' | 'CHALLENGE';
  status: string;
}

interface PendingParticipation {
  id: string;
  challengeId: string;
  challengeTitle: string;
  employeeId: string;
  employeeName: string;
  proofUrl: string | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  xpAwarded: number | null;
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export const GamificationPage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation Tabs
  type TabType = 'challenges' | 'approvals' | 'badges' | 'rewards' | 'leaderboard';
  
  const getTabFromPath = (): TabType => {
    const path = location.pathname;
    if (path.includes('/approvals')) return 'approvals';
    if (path.includes('/badges')) return 'badges';
    if (path.includes('/rewards')) return 'rewards';
    if (path.includes('/leaderboard')) return 'leaderboard';
    return 'challenges';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromPath());

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'challenges') navigate('/gamification/challenges');
    else if (tab === 'approvals') navigate('/gamification/approvals');
    else if (tab === 'badges') navigate('/gamification/badges');
    else if (tab === 'rewards') navigate('/gamification/rewards');
    else if (tab === 'leaderboard') navigate('/gamification/leaderboard');
  };

  // Sub-filter pills for Challenges
  type FilterType = 'ALL' | 'DRAFT' | 'ACTIVE' | 'UNDER_REVIEW' | 'COMPLETED' | 'ARCHIVED';
  const [challengeFilter, setChallengeFilter] = useState<FilterType>('ALL');

  // Component Data States
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pendingParticipations, setPendingParticipations] = useState<PendingParticipation[]>([]);

  // Loading indicators
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  // Modal and Form States
  const [showNewChallengeModal, setShowNewChallengeModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState<Challenge | null>(null);
  const [showRedeemConfirm, setShowRedeemConfirm] = useState<Reward | null>(null);

  // New Challenge Form Fields
  const [newTitle, setNewTitle] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newXp, setNewXp] = useState('100');
  const [newDifficulty, setNewDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [newEvidenceRequired, setNewEvidenceRequired] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');

  // Join Challenge File Upload Fields
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submittingJoin, setSubmittingJoin] = useState(false);

  // --- API Fetches ---

  const fetchChallenges = useCallback(async () => {
    setLoadingChallenges(true);
    try {
      const res = await api.get('/gamification/challenges');
      if (res.data && res.data.success) {
        setChallenges(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching challenges:', err);
      toast.error('Failed to load challenges.');
    } finally {
      setLoadingChallenges(false);
    }
  }, []);

  const fetchBadges = useCallback(async () => {
    setLoadingBadges(true);
    try {
      const res = await api.get('/gamification/badges');
      if (res.data && res.data.success) {
        setBadges(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching badges:', err);
      toast.error('Failed to load badges.');
    } finally {
      setLoadingBadges(false);
    }
  }, []);

  const fetchRewards = useCallback(async () => {
    setLoadingRewards(true);
    try {
      const res = await api.get('/gamification/rewards');
      if (res.data && res.data.success) {
        setRewards(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching rewards:', err);
      toast.error('Failed to load rewards.');
    } finally {
      setLoadingRewards(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await api.get('/gamification/leaderboard');
      if (res.data && res.data.success) {
        setLeaderboard(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      toast.error('Failed to load leaderboard.');
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  const fetchApprovalsQueue = useCallback(async () => {
    if (!isAdminOrManager) return;
    setLoadingApprovals(true);
    try {
      const res = await api.get('/gamification/challenges/participations');
      if (res.data && res.data.success) {
        setPendingParticipations(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching approvals queue:', err);
      toast.error('Failed to load challenge approvals queue.');
    } finally {
      setLoadingApprovals(false);
    }
  }, [isAdminOrManager]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/settings/categories');
      if (res.data && res.data.success) {
        const challengeCats = res.data.data.filter((c: Category) => c.type === 'CHALLENGE');
        setCategories(challengeCats);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/settings/departments');
      if (res.data && res.data.success) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    fetchChallenges();
    fetchCategories();
    fetchDepartments();
    if (isAdminOrManager) {
      fetchApprovalsQueue();
    }
  }, [fetchChallenges, fetchCategories, fetchDepartments, fetchApprovalsQueue, isAdminOrManager]);

  // Tab change fetches
  useEffect(() => {
    if (activeTab === 'badges') {
      fetchBadges();
    } else if (activeTab === 'rewards') {
      fetchRewards();
    } else if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    } else if (activeTab === 'approvals') {
      fetchApprovalsQueue();
    } else if (activeTab === 'challenges') {
      fetchChallenges();
    }
  }, [activeTab, fetchChallenges, fetchBadges, fetchRewards, fetchLeaderboard, fetchApprovalsQueue]);

  // Socket listener for real-time leaderboard update
  useEffect(() => {
    const handleLeaderboardUpdate = () => {
      console.log('[Socket] Leaderboard update event received. Refetching...');
      fetchLeaderboard();
    };

    socket.on('leaderboard:update', handleLeaderboardUpdate);
    return () => {
      socket.off('leaderboard:update', handleLeaderboardUpdate);
    };
  }, [fetchLeaderboard]);

  // Department ID to Name mapping
  const departmentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    departments.forEach((d) => {
      map[d.id] = d.name;
    });
    return map;
  }, [departments]);

  // --- Handlers ---

  // Handle Challenge Status Transition (Admin/Manager only)
  const handleTransitionStatus = async (challengeId: string, newStatus: string) => {
    try {
      const res = await api.patch(`/gamification/challenges/${challengeId}/status`, { status: newStatus });
      if (res.data && res.data.success) {
        toast.success(`Challenge status updated to ${newStatus}`);
        fetchChallenges();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to update challenge status.';
      toast.error(errMsg);
    }
  };

  // Submit Join Challenge Form
  const handleJoinChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showJoinModal) return;

    if (showJoinModal.evidenceRequired && !proofFile) {
      toast.error('Proof document is required for this challenge.');
      return;
    }

    setSubmittingJoin(true);
    try {
      const formData = new FormData();
      if (proofFile) {
        formData.append('proof', proofFile);
      }

      const res = await api.post(`/gamification/challenges/${showJoinModal.id}/join`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.success) {
        toast.success('Successfully joined challenge! Awaiting approval.');
        setShowJoinModal(null);
        setProofFile(null);
        fetchChallenges();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to join challenge.';
      toast.error(errMsg);
    } finally {
      setSubmittingJoin(false);
    }
  };

  // Submit New Challenge Form (Admin/Manager only)
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCategoryId || !newDescription || !newXp) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      const payload = {
        title: newTitle,
        categoryId: newCategoryId,
        description: newDescription,
        xp: parseInt(newXp, 10),
        difficulty: newDifficulty,
        evidenceRequired: newEvidenceRequired,
        deadline: newDeadline || null
      };

      const res = await api.post('/gamification/challenges', payload);
      if (res.data && res.data.success) {
        toast.success('New challenge drafted successfully!');
        setShowNewChallengeModal(false);
        // Reset form fields
        setNewTitle('');
        setNewCategoryId('');
        setNewDescription('');
        setNewXp('100');
        setNewDifficulty('MEDIUM');
        setNewEvidenceRequired(false);
        setNewDeadline('');
        // Refresh challenges
        fetchChallenges();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to create challenge.';
      toast.error(errMsg);
    }
  };

  // Approve challenge participation (Admin/Manager only)
  const handleApproveParticipation = async (participationId: string) => {
    try {
      const res = await api.patch(`/gamification/challenges/participations/${participationId}/approve`);
      if (res.data && res.data.success) {
        toast.success('Challenge completion approved successfully!');
        fetchApprovalsQueue();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to approve participation.';
      toast.error(errMsg);
    }
  };

  // Reject challenge participation (Admin/Manager only)
  const handleRejectParticipation = async (participationId: string) => {
    try {
      const res = await api.patch(`/gamification/challenges/participations/${participationId}/reject`);
      if (res.data && res.data.success) {
        toast.error('Challenge participation rejected.');
        fetchApprovalsQueue();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to reject participation.';
      toast.error(errMsg);
    }
  };

  // Redeem Reward Confirmation
  const handleRedeemConfirmSubmit = async () => {
    if (!showRedeemConfirm) return;
    try {
      const res = await api.post(`/gamification/rewards/${showRedeemConfirm.id}/redeem`);
      if (res.data && res.data.success) {
        toast.success(`🎁 Reward redeemed! ${showRedeemConfirm.pointsRequired} points deducted.`);
        
        // Update local user context balance
        if (user) {
          setUser({
            ...user,
            pointsBalance: res.data.data.newBalance
          });
        }
        
        setShowRedeemConfirm(null);
        fetchRewards();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to redeem reward.';
      toast.error(errMsg);
    }
  };

  // Resolve dynamic proof URL paths
  const getProofDownloadUrl = (filename: string) => {
    const backendBase = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
    return `${backendBase}/uploads/${filename}`;
  };

  // Filtered challenges list
  const filteredChallenges = useMemo(() => {
    if (challengeFilter === 'ALL') return challenges;
    return challenges.filter((c) => c.status === challengeFilter);
  }, [challenges, challengeFilter]);

  return (
    <div className="gamify-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* CSS Stylesheet Injector */}
      <style>{`
        .glass-card {
          background: #ffffff;
          border: 1px solid rgba(25,53,12,0.10);
          border-radius: 14px;
          box-shadow: 0 1px 4px rgba(25,53,12,0.06), 0 2px 12px rgba(25,53,12,0.04);
          position: relative;
          overflow: hidden;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(25,53,12,0.10);
        }
        .tab-btn {
          background: none;
          border: none;
          font-weight: 500;
          font-size: 0.875rem;
          color: #687D31;
          cursor: pointer;
          padding: 0.625rem 0.875rem;
          position: relative;
          transition: color 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .tab-btn:hover {
          color: #19350C;
        }
        .tab-btn.active {
          color: #19350C;
          font-weight: 600;
        }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: #687D31;
          border-radius: 999px;
        }
        .filter-pill {
          background: rgba(25,53,12,0.05);
          border: 1px solid rgba(25,53,12,0.12);
          color: #687D31;
          padding: 0.35rem 0.875rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s ease;
          font-family: 'Inter', sans-serif;
        }
        .filter-pill:hover {
          background: rgba(25,53,12,0.09);
          color: #19350C;
        }
        .filter-pill.active {
          background: rgba(104,125,49,0.15);
          border-color: rgba(104,125,49,0.35);
          color: #19350C;
          font-weight: 600;
        }
        .btn-gamify {
          background: #687D31;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 0.575rem 1.125rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
        }
        .btn-gamify:hover:not(:disabled) {
          background: #7A9038;
          transform: translateY(-1px);
        }
        .btn-gamify:disabled {
          background: rgba(25,53,12,0.08);
          color: #687D31;
          cursor: not-allowed;
        }
        .btn-secondary-gamify {
          background: rgba(25,53,12,0.06);
          border: 1px solid rgba(25,53,12,0.14);
          color: #3D4A28;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: 'Inter', sans-serif;
        }
        .btn-secondary-gamify:hover {
          background: rgba(25,53,12,0.10);
          color: #19350C;
        }
        .text-truncate-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .glass-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .glass-table th {
          color: #687D31;
          font-weight: 600;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 0.875rem 1rem;
          border-bottom: 1px solid rgba(25,53,12,0.10);
        }
        .glass-table td {
          padding: 1.125rem 1rem;
          border-bottom: 1px solid rgba(25,53,12,0.06);
          color: #3D4A28;
          font-size: 0.875rem;
        }
        .glass-table tr:last-child td {
          border-bottom: none;
        }
        .glass-table tr:hover td {
          background: rgba(104,125,49,0.04);
        }
        .form-input {
          background: #ffffff;
          border: 1px solid rgba(25,53,12,0.18);
          border-radius: 8px;
          color: #19350C;
          padding: 0.6rem 0.75rem;
          font-size: 0.875rem;
          width: 100%;
          outline: none;
          transition: border-color 0.18s;
          font-family: 'Inter', sans-serif;
        }
        .form-input:focus {
          border-color: #687D31;
        }
        .shimmer-anim {
          background: linear-gradient(90deg, #f0ede9 25%, #e8e4df 37%, #f0ede9 63%);
          background-size: 400% 100%;
          animation: shimmer-load 1.4s ease infinite;
        }
        @keyframes shimmer-load {
          0% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: '700', letterSpacing: '-0.02em', margin: 0, color: '#19350C' }}>
            Gamification Center
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Compete in ESG challenges, unlock milestone badges, and redeem verified reward points.
          </p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid rgba(25,53,12,0.10)', overflowX: 'auto', paddingBottom: '2px', marginBottom: '1.5rem' }}>
        <button
          onClick={() => handleTabChange('challenges')}
          className={`tab-btn ${activeTab === 'challenges' ? 'active' : ''}`}
        >
          Challenges
        </button>
        {isAdminOrManager && (
          <button
            onClick={() => handleTabChange('approvals')}
            className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
          >
            Challenge Approvals
          </button>
        )}
        <button
          onClick={() => handleTabChange('badges')}
          className={`tab-btn ${activeTab === 'badges' ? 'active' : ''}`}
        >
          Badges
        </button>
        <button
          onClick={() => handleTabChange('rewards')}
          className={`tab-btn ${activeTab === 'rewards' ? 'active' : ''}`}
        >
          Rewards
        </button>
        <button
          onClick={() => handleTabChange('leaderboard')}
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
        >
          Leaderboard
        </button>
      </div>

      {/* ─────────────────────────────────────────
          CHALLENGES TAB
          ───────────────────────────────────────── */}
      {activeTab === 'challenges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Sub-filters and Actions row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Pills filter */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['ALL', 'DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED'] as FilterType[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setChallengeFilter(filter)}
                  className={`filter-pill ${challengeFilter === filter ? 'active' : ''}`}
                >
                  {filter === 'ALL' ? 'All' : filter === 'UNDER_REVIEW' ? 'Under Review' : filter.charAt(0) + filter.slice(1).toLowerCase().replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Manager New Challenge Button */}
            {isAdminOrManager && (
              <button
                onClick={() => setShowNewChallengeModal(true)}
                className="btn-gamify"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem' }}
              >
                <Plus size={16} /> New Challenge
              </button>
            )}
          </div>

          {/* Loading Grid Skeleton */}
          {loadingChallenges ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="shimmer-anim" style={{ height: '240px', borderRadius: '16px' }} />
              ))}
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
              <Trophy size={40} style={{ margin: '0 auto 1rem auto', display: 'block', opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>No challenges found for this status.</p>
            </div>
          ) : (
            /* Challenges Grid */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {filteredChallenges.map((ch) => {
                // Determine Difficulty badge styling
                const diffColorMap = {
                  EASY: { bg: 'rgba(25, 53, 12, 0.06)', text: '#3D4A28' },
                  MEDIUM: { bg: 'rgba(104, 125, 49, 0.1)', text: '#687D31' },
                  HARD: { bg: 'rgba(138, 106, 40, 0.1)', text: '#8A6A28' }
                };
                const diffStyle = diffColorMap[ch.difficulty] || diffColorMap.MEDIUM;

                // Determine Status badge styling
                const statusStyleMap = {
                  DRAFT: { bg: 'rgba(25, 53, 12, 0.05)', text: '#3D4A28' },
                  ACTIVE: { bg: 'rgba(104, 125, 49, 0.1)', text: '#687D31' },
                  UNDER_REVIEW: { bg: 'rgba(138, 106, 40, 0.08)', text: '#8A6A28' },
                  COMPLETED: { bg: 'rgba(25, 53, 12, 0.08)', text: '#19350C' },
                  ARCHIVED: { bg: 'rgba(25, 53, 12, 0.04)', text: '#64748b' }
                };
                const statusStyle = statusStyleMap[ch.status] || statusStyleMap.DRAFT;

                return (
                  <div key={ch.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Top Accent Bar */}
                    <div style={{ height: '4px', background: '#687D31', width: '100%' }} />

                    {/* Card Content Body */}
                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                      
                      {/* Top Badges Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          background: diffStyle.bg,
                          color: diffStyle.text,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: '999px',
                          padding: '2px 8px'
                        }}>
                          {ch.difficulty}
                        </span>
                        
                        <span style={{
                          background: statusStyle.bg,
                          color: statusStyle.text,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: '999px',
                          padding: '2px 8px'
                        }}>
                          {ch.status === 'UNDER_REVIEW' ? 'Review Needed' : ch.status}
                        </span>
                      </div>

                      {/* Header with Title and Icon */}
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{
                          background: 'rgba(25, 53, 12, 0.05)',
                          borderRadius: '8px',
                          padding: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#19350C',
                          flexShrink: 0
                        }}>
                          <Trophy size={18} />
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#19350C', margin: 0, lineHeight: '1.3' }}>
                          {ch.title}
                        </h3>
                      </div>

                      {/* Description */}
                      <p className="text-truncate-2" style={{ fontSize: '0.875rem', color: '#3D4A28', margin: 0, lineHeight: '1.4', flex: 1 }}>
                        {ch.description}
                      </p>

                      {/* Info & Category badges */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', paddingTop: '0.25rem' }}>
                        {ch.category?.name && (
                          <span style={{
                            background: 'rgba(25, 53, 12, 0.05)',
                            color: '#3D4A28',
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            borderRadius: '999px',
                            padding: '1px 8px'
                          }}>
                            {ch.category.name}
                          </span>
                        )}

                        <span style={{ fontSize: '0.725rem', color: '#19350C', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          🏆 {ch.xp} XP
                        </span>
                      </div>

                      {/* Deadline Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#3D4A28', fontWeight: 500 }}>
                        <Clock size={12} />
                        <span>Deadline: {ch.deadline ? new Date(ch.deadline).toLocaleDateString() : 'None'}</span>
                      </div>

                      {/* Actions Division */}
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(25, 53, 12, 0.08)', paddingTop: '0.75rem' }}>
                        
                        {/* Join / Participation Actions */}
                        {user && (
                          <>
                            {ch.status === 'ACTIVE' && ch.joinStatus === null && (
                              <button
                                onClick={() => setShowJoinModal(ch)}
                                className="btn-gamify"
                                style={{ width: '100%', padding: '0.5rem' }}
                              >
                                Join Challenge
                              </button>
                            )}

                            {ch.joinStatus === 'PENDING' && (
                              <div style={{
                                background: 'rgba(245, 158, 11, 0.12)',
                                color: '#f59e0b',
                                padding: '0.5rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textAlign: 'center'
                              }}>
                                ⏳ Pending approval
                              </div>
                            )}

                            {ch.joinStatus === 'APPROVED' && (
                              <div style={{
                                background: 'rgba(34, 197, 94, 0.12)',
                                color: '#22c55e',
                                padding: '0.5rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textAlign: 'center'
                              }}>
                                ✅ Completed
                              </div>
                            )}

                            {ch.joinStatus === 'REJECTED' && (
                              <div style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                color: '#ef4444',
                                padding: '0.5rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textAlign: 'center'
                              }}>
                                ❌ Rejected Submission
                              </div>
                            )}
                          </>
                        )}

                        {/* Admin / Manager State Transition buttons */}
                        {isAdminOrManager && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {ch.status === 'DRAFT' && (
                              <button
                                onClick={() => handleTransitionStatus(ch.id, 'ACTIVE')}
                                className="btn-gamify"
                                style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                              >
                                Activate
                              </button>
                            )}
                            {ch.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleTransitionStatus(ch.id, 'UNDER_REVIEW')}
                                className="btn-secondary-gamify"
                                style={{ flex: 1 }}
                              >
                                Send for Review
                              </button>
                            )}
                            {ch.status === 'UNDER_REVIEW' && (
                              <button
                                onClick={() => handleTransitionStatus(ch.id, 'COMPLETED')}
                                className="btn-secondary-gamify"
                                style={{ flex: 1, borderColor: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' }}
                              >
                                Mark Complete
                              </button>
                            )}
                            {ch.status !== 'ARCHIVED' && (
                              <button
                                onClick={() => handleTransitionStatus(ch.id, 'ARCHIVED')}
                                className="btn-secondary-gamify"
                                style={{ color: '#9a3030', borderColor: 'rgba(154, 48, 48, 0.24)', background: 'rgba(154, 48, 48, 0.05)' }}
                              >
                                Archive
                              </button>
                            )}
                            {ch.status === 'ARCHIVED' && (
                              <button
                                onClick={() => handleTransitionStatus(ch.id, 'ACTIVE')}
                                className="btn-gamify"
                                style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        )}

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ─────────────────────────────────────────
          CHALLENGE APPROVALS TAB (ADMIN/MANAGER ONLY)
          ───────────────────────────────────────── */}
      {activeTab === 'approvals' && isAdminOrManager && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#19350C', marginTop: 0, marginBottom: '1.25rem' }}>
            Challenge Approvals Queue
          </h2>

          {loadingApprovals ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1, 2].map((i) => (
                <div key={i} className="shimmer-anim" style={{ height: '48px', borderRadius: '8px' }} />
              ))}
            </div>
          ) : pendingParticipations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#3D4A28' }}>
              <CheckCircle size={32} style={{ color: '#22c55e', margin: '0 auto 0.75rem auto', display: 'block' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No pending challenge approval requests.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Challenge</th>
                    <th>Proof Document</th>
                    <th>XP Reward</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingParticipations.map((part) => (
                    <tr key={part.id}>
                      <td style={{ color: '#19350C', fontWeight: 700 }}>{part.employeeName}</td>
                      <td>{part.challengeTitle}</td>
                      <td>
                        {part.proofUrl ? (
                          <a
                            href={getProofDownloadUrl(part.proofUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#8A6A28',
                              textDecoration: 'none',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FileText size={14} /> View Document
                          </a>
                        ) : (
                          <span style={{ color: '#687D31', fontSize: '0.85rem' }}>No proof uploaded</span>
                        )}
                      </td>
                      <td style={{ color: '#8A6A28', fontWeight: 700 }}>
                        🏆 {part.xpAwarded || 100} XP
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleApproveParticipation(part.id)}
                            className="btn-secondary-gamify"
                            style={{ borderColor: 'rgba(34, 197, 94, 0.3)', color: '#22c55e' }}
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleRejectParticipation(part.id)}
                            className="btn-secondary-gamify"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────
          BADGES TAB
          ───────────────────────────────────────── */}
      {activeTab === 'badges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#19350C', margin: 0 }}>
              Milestone Badge Achievements
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#3D4A28', margin: '4px 0 0 0' }}>
              Complete actions across EcoSphere to unlock permanent awards and bragging rights.
            </p>
          </div>

          {loadingBadges ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="shimmer-anim" style={{ height: '180px', borderRadius: '16px' }} />
              ))}
            </div>
          ) : badges.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: '#3D4A28' }}>
              <Lock size={32} style={{ margin: '0 auto 0.75rem auto', display: 'block', opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No badges configured in the database.</p>
            </div>
          ) : (
            /* Badges Grid */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {badges.map((b) => {
                const ruleLabel = 
                  b.unlockRuleType === 'XP_THRESHOLD' ? `Earn ${b.unlockRuleValue} XP` :
                  b.unlockRuleType === 'CHALLENGE_COUNT' ? `Complete ${b.unlockRuleValue} Challenges` :
                  b.unlockRuleType === 'CSR_COUNT' ? `Join ${b.unlockRuleValue} CSR Activities` :
                  `Action value of ${b.unlockRuleValue}`;

                return (
                  <div
                    key={b.id}
                    className="glass-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '1.5rem 1.25rem',
                      textAlign: 'center',
                      gap: '0.75rem',
                      opacity: b.earned ? 1 : 0.6,
                      border: b.earned ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(25, 53, 12, 0.08)',
                      boxShadow: b.earned ? '0 0 20px rgba(34, 197, 94, 0.1)' : 'none'
                    }}
                  >
                    {/* Badge Emoji */}
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem', filter: b.earned ? 'none' : 'grayscale(100%)' }}>
                      {b.icon || '🏆'}
                    </div>

                    {/* Badge Details */}
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#19350C', margin: '0 0 4px 0' }}>
                        {b.name}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: '#3D4A28', margin: 0, lineHeight: 1.3 }}>
                        {b.description}
                      </p>
                    </div>

                    <span style={{ fontSize: '0.7rem', color: '#687D31', fontWeight: 600, display: 'block', marginTop: 'auto' }}>
                      {ruleLabel}
                    </span>

                    {/* Status Pill */}
                    {b.earned ? (
                      <span style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#22c55e',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        borderRadius: '999px',
                        padding: '2px 10px',
                        marginTop: '0.25rem'
                      }}>
                        ✓ Earned
                      </span>
                    ) : (
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#64748b',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        borderRadius: '999px',
                        padding: '2px 10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '0.25rem'
                      }}>
                        <Lock size={10} /> Locked
                      </span>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────
          REWARDS TAB
          ───────────────────────────────────────── */}
      {activeTab === 'rewards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Rewards Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#19350C', margin: 0 }}>
                Eco Merch Store
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#3D4A28', margin: '4px 0 0 0' }}>
                Exchange points earned from sustainable activities for premium carbon-neutral merchandise.
              </p>
            </div>
            
            {/* Balance Pill */}
            <div className="glass-card" style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '999px',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(245, 158, 11, 0.03)'
            }}>
              <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💎 Your Balance: {user?.pointsBalance || 0} pts
              </span>
            </div>
          </div>

          {/* Loading Grid Skeleton */}
          {loadingRewards ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="shimmer-anim" style={{ height: '200px', borderRadius: '16px' }} />
              ))}
            </div>
          ) : rewards.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: '#3D4A28' }}>
              <Gift size={32} style={{ margin: '0 auto 0.75rem auto', display: 'block', opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No active rewards listed in the store.</p>
            </div>
          ) : (
            /* Rewards Grid */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {rewards.map((reward) => {
                const hasEnoughPoints = (user?.pointsBalance || 0) >= reward.pointsRequired;
                const canRedeem = reward.stock > 0 && hasEnoughPoints;

                return (
                  <div key={reward.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                      
                      {/* Title & Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#19350C', margin: 0 }}>
                          {reward.name}
                        </h3>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b', whiteSpace: 'nowrap' }}>
                          💎 {reward.pointsRequired} pts
                        </span>
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '0.85rem', color: '#3D4A28', margin: 0, lineHeight: 1.4, flex: 1 }}>
                        {reward.description}
                      </p>

                      {/* Stock Info Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <span style={{ color: '#687D31' }}>Availability:</span>
                        {reward.stock > 0 ? (
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>{reward.stock} remaining</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>Out of stock</span>
                        )}
                      </div>

                      {/* Redeem Action button */}
                      {user && (
                        <button
                          onClick={() => setShowRedeemConfirm(reward)}
                          className="btn-gamify"
                          disabled={!canRedeem}
                          style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem' }}
                        >
                          {reward.stock <= 0 ? 'Out of Stock' : !hasEnoughPoints ? 'Insufficient Balance' : 'Redeem'}
                        </button>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────
          LEADERBOARD TAB
          ───────────────────────────────────────── */}
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#19350C', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Crown size={22} color="#f59e0b" /> Organization ESG Leaderboard
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#3D4A28', margin: '4px 0 0 0', fontWeight: 500 }}>
              Real-time standings of all members sorted by total sustainability XP earned.
            </p>
          </div>

          {loadingLeaderboard ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="shimmer-anim" style={{ height: '52px', borderRadius: '12px' }} />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: '#3D4A28' }}>
              <Users size={32} style={{ margin: '0 auto 0.75rem auto', display: 'block', opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No users on the leaderboard.</p>
            </div>
          ) : (
            /* Leaderboard Table Card */
            <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
              <table className="glass-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', paddingLeft: '1.5rem', color: '#19350C' }}>Rank</th>
                    <th style={{ color: '#19350C' }}>Name</th>
                    <th style={{ color: '#19350C' }}>Department</th>
                    <th style={{ color: '#19350C' }}>Badges</th>
                    <th style={{ textAlign: 'right', paddingRight: '1.5rem', color: '#19350C' }}>Total XP</th>
                  </tr>
                </thead>
                <tbody style={{ position: 'relative' }}>
                  <AnimatePresence initial={false}>
                    {leaderboard.map((item, idx) => {
                      const isCurrentUser = item.id === user?.id;
                      const rank = idx + 1;
                      const deptName = item.departmentId ? departmentNameMap[item.departmentId] || 'Unassigned' : 'Unassigned';

                      // Rank Badge styling
                      let rankDisplay: React.ReactNode = `#${rank}`;
                      if (rank === 1) {
                        rankDisplay = (
                          <span style={{ color: '#f59e0b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Crown size={16} /> 1st
                          </span>
                        );
                      } else if (rank === 2) {
                        rankDisplay = (
                          <span style={{ color: '#94a3b8', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Star size={14} /> 2nd
                          </span>
                        );
                      } else if (rank === 3) {
                        rankDisplay = (
                          <span style={{ color: '#b45309', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Zap size={14} /> 3rd
                          </span>
                        );
                      }

                      return (
                        <motion.tr
                          key={item.id}
                          layout
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          style={{
                            background: isCurrentUser ? 'rgba(104, 125, 49, 0.08)' : 'transparent',
                            borderLeft: isCurrentUser ? '3px solid #687D31' : 'none'
                          }}
                        >
                          <td style={{ fontWeight: '800', paddingLeft: '1.5rem', color: '#19350C' }}>{rankDisplay}</td>
                          <td style={{ fontWeight: isCurrentUser ? 700 : 500, color: isCurrentUser ? '#19350C' : '#2C3E20' }}>
                            {item.name} {isCurrentUser && <span style={{ color: '#687D31', fontSize: '0.8rem', marginLeft: '4px', fontWeight: 700 }}>(You)</span>}
                          </td>
                          <td style={{ color: '#2C3E20', fontWeight: 500 }}>{deptName}</td>
                          <td>
                            <span style={{
                              background: 'rgba(249, 115, 22, 0.1)',
                              color: '#f97316',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              borderRadius: '999px',
                              padding: '2px 8px'
                            }}>
                              🏅 {item.badgeCount} badges
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: '1.5rem', fontWeight: 700, color: '#f97316' }}>
                            {item.xp} XP
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────
          MODALS
          ───────────────────────────────────────── */}

      {/* NEW CHALLENGE MODAL (ADMIN/MANAGER ONLY) */}
      {/* NEW CHALLENGE MODAL */}
      {showNewChallengeModal && isAdminOrManager && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', margin: '1rem', backgroundColor: '#ffffff', border: '1px solid rgba(25, 53, 12, 0.12)', boxShadow: '0 10px 30px rgba(25, 53, 12, 0.1)' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#19350C', margin: 0 }}>
                Draft New Challenge
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#3D4A28', margin: '4px 0 0 0', fontWeight: 500 }}>
                Fill out the fields to publish or save an ESG eco-challenge.
              </p>
            </div>

            <form onSubmit={handleCreateChallenge} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Title */}
              <div>
                <label style={{ display: 'block', color: '#19350C', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Challenge Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tree Planting Drive"
                  className="form-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ background: '#ffffff', color: '#19350C', border: '1px solid rgba(25, 53, 12, 0.15)' }}
                  required
                />
              </div>

              {/* Grid block for Category & Difficulty */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Category dropdown */}
                <div>
                  <label style={{ display: 'block', color: '#19350C', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Category *
                  </label>
                  <select
                    className="form-input"
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    style={{ background: '#ffffff', color: '#19350C', border: '1px solid rgba(25, 53, 12, 0.15)' }}
                    required
                  >
                    <option value="" disabled style={{ background: '#ffffff', color: '#19350C' }}>Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: '#ffffff', color: '#19350C' }}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label style={{ display: 'block', color: '#19350C', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Difficulty *
                  </label>
                  <select
                    className="form-input"
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as any)}
                    style={{ background: '#ffffff', color: '#19350C', border: '1px solid rgba(25, 53, 12, 0.15)' }}
                    required
                  >
                    <option value="EASY" style={{ background: '#ffffff', color: '#19350C' }}>Easy</option>
                    <option value="MEDIUM" style={{ background: '#ffffff', color: '#19350C' }}>Medium</option>
                    <option value="HARD" style={{ background: '#ffffff', color: '#19350C' }}>Hard</option>
                  </select>
                </div>
              </div>

              {/* Grid block for XP & Deadline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* XP */}
                <div>
                  <label style={{ display: 'block', color: '#19350C', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    XP Value *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={newXp}
                    onChange={(e) => setNewXp(e.target.value)}
                    style={{ background: '#ffffff', color: '#19350C', border: '1px solid rgba(25, 53, 12, 0.15)' }}
                    required
                  />
                </div>

                {/* Deadline */}
                <div>
                  <label style={{ display: 'block', color: '#19350C', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    style={{ background: '#ffffff', color: '#19350C', border: '1px solid rgba(25, 53, 12, 0.15)' }}
                  />
                </div>
              </div>

              {/* Evidence Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                <input
                  type="checkbox"
                  id="evidence-req-toggle"
                  checked={newEvidenceRequired}
                  onChange={(e) => setNewEvidenceRequired(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#687D31', cursor: 'pointer' }}
                />
                <label htmlFor="evidence-req-toggle" style={{ color: '#19350C', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  Proof / Evidence Document Required
                </label>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', color: '#19350C', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Description *
                </label>
                <textarea
                  placeholder="Detail the guidelines, targets, and expected outcomes..."
                  className="form-input"
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{ resize: 'none', background: '#ffffff', color: '#19350C', border: '1px solid rgba(25, 53, 12, 0.15)' }}
                  required
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowNewChallengeModal(false)}
                  style={{
                    background: 'rgba(25, 53, 12, 0.05)',
                    border: '1px solid rgba(25, 53, 12, 0.1)',
                    borderRadius: '8px',
                    color: '#3D4A28',
                    padding: '0.5rem 1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#687D31',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    boxShadow: '0 4px 12px rgba(104, 125, 49, 0.2)'
                  }}
                >
                  Create Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN CHALLENGE MODAL */}
      {showJoinModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', margin: '1rem', backgroundColor: '#ffffff', border: '1px solid rgba(25, 53, 12, 0.12)', boxShadow: '0 10px 30px rgba(25, 53, 12, 0.1)' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#19350C', margin: 0 }}>
                Join Challenge
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#3D4A28', margin: '4px 0 0 0', fontWeight: 500 }}>
                Confirm your participation in <strong>{showJoinModal.title}</strong>
              </p>
            </div>

            <form onSubmit={handleJoinChallengeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Evidence File Upload Area */}
              {showJoinModal.evidenceRequired ? (
                <div>
                  <label style={{ display: 'block', color: '#19350C', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Upload proof of completion *
                  </label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setProofFile(e.dataTransfer.files[0]);
                      }
                    }}
                    style={{
                      border: dragOver ? '2px dashed #687D31' : '2px dashed rgba(25, 53, 12, 0.2)',
                      borderRadius: '12px',
                      padding: '2.5rem 1.5rem',
                      textAlign: 'center',
                      background: dragOver ? 'rgba(104, 125, 49, 0.08)' : 'rgba(25, 53, 12, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onClick={() => document.getElementById('join-proof-input')?.click()}
                  >
                    <Upload size={28} style={{ color: '#687D31', marginBottom: '0.75rem', marginLeft: 'auto', marginRight: 'auto' }} />
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#19350C' }}>
                      {proofFile ? proofFile.name : 'Select or drop proof document'}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#3D4A28', fontWeight: 500 }}>
                      Supports PNG, JPG, JPEG, and PDF
                    </p>
                    <input
                      id="join-proof-input"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(104, 125, 49, 0.08)',
                  border: '1px solid rgba(104, 125, 49, 0.15)',
                  borderRadius: '8px',
                  padding: '1rem',
                  fontSize: '0.85rem',
                  color: '#687D31',
                  lineHeight: '1.4'
                }}>
                  No evidence upload required for this challenge. Click "Join Drive" below to complete and automatically claim reward!
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(null);
                    setProofFile(null);
                  }}
                  style={{
                    background: 'rgba(25, 53, 12, 0.05)',
                    border: '1px solid rgba(25, 53, 12, 0.1)',
                    borderRadius: '8px',
                    color: '#687D31',
                    padding: '0.5rem 1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                  disabled={submittingJoin}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#687D31',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    boxShadow: '0 4px 12px rgba(104, 125, 49, 0.2)'
                  }}
                  disabled={submittingJoin}
                >
                  {submittingJoin ? 'Submitting...' : 'Join Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REDEEM REWARD CONFIRMATION MODAL */}
      {showRedeemConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', margin: '1rem', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid rgba(25, 53, 12, 0.12)', boxShadow: '0 10px 30px rgba(25, 53, 12, 0.1)' }}>
            <div>
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                margin: '0 auto 0.75rem auto'
              }}>
                <Gift size={22} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#19350C', margin: 0 }}>
                Confirm Redemption
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#3D4A28', margin: '6px 0 0 0', lineHeight: '1.4', fontWeight: 500 }}>
                Confirm redemption of <strong>{showRedeemConfirm.name}</strong> for <strong>{showRedeemConfirm.pointsRequired} points</strong>?
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setShowRedeemConfirm(null)}
                style={{
                  background: 'rgba(25, 53, 12, 0.05)',
                  border: '1px solid rgba(25, 53, 12, 0.1)',
                  borderRadius: '8px',
                  color: '#687D31',
                  padding: '0.5rem 1.25rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleRedeemConfirmSubmit}
                style={{
                  background: '#687D31',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '0.5rem 1.25rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  boxShadow: '0 4px 12px rgba(104, 125, 49, 0.2)'
                }}
              >
                Yes, Redeem
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GamificationPage;
