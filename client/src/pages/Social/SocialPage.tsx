import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {
  Users, Plus, CheckCircle, XCircle, Clock, Upload, Award, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

export const SocialPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = (): 'activities' | 'approvals' | 'diversity' => {
    const path = location.pathname;
    if (path.includes('/approvals')) return 'approvals';
    if (path.includes('/diversity')) return 'diversity';
    return 'activities';
  };

  // Component States
  const [activities, setActivities] = useState<any[]>([]);
  const [participations, setParticipations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'activities' | 'approvals' | 'diversity'>(getTabFromPath());

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tab: 'activities' | 'approvals' | 'diversity') => {
    setActiveTab(tab);
    if (tab === 'activities') navigate('/social/activities');
    else if (tab === 'approvals') navigate('/social/approvals');
    else if (tab === 'diversity') navigate('/social/diversity');
  };
  const [loading, setLoading] = useState<boolean>(true);

  // Modals Toggle States
  const [showNewActivityModal, setShowNewActivityModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<{ open: boolean; activity: any }>({
    open: false,
    activity: null
  });

  // Form Fields - New Activity
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newXpReward, setNewXpReward] = useState<number>(50);
  const [newDeadline, setNewDeadline] = useState<string>('');
  const [evidenceRequired, setEvidenceRequired] = useState<boolean>(false);
  const [newMaxParticipants, setNewMaxParticipants] = useState<string>('');

  // Form Fields - Join Activity
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [esgSettings, setEsgSettings] = useState<any>(null);

  // Fetch ESG Settings
  const fetchEsgSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings/esg-config');
      if (res.data && res.data.success) {
        setEsgSettings(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load ESG config in SocialPage', e);
    }
  }, []);

  // Fetch CSR Activities
  const fetchActivities = useCallback(async () => {
    try {
      const res = await api.get('/social');
      if (res.data && res.data.success) {
        setActivities(res.data.data);
      }
    } catch (error: any) {
      console.error('[SocialPage] Error fetching activities:', error);
      toast.error('Failed to load CSR activities.');
    }
  }, []);

  // Fetch Pending Participations (Approvals Queue)
  const fetchParticipations = useCallback(async () => {
    if (!isAdminOrManager) return;
    try {
      const res = await api.get('/social/participations');
      if (res.data && res.data.success) {
        setParticipations(res.data.data);
      }
    } catch (error: any) {
      console.error('[SocialPage] Error fetching participations:', error);
      toast.error('Failed to load pending approvals.');
    }
  }, [isAdminOrManager]);

  // Fetch Categories for new activity dropdown
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/settings/categories');
      if (res.data && res.data.success) {
        const csrCategories = res.data.data.filter((c: any) => c.type === 'CSR_ACTIVITY');
        setCategories(csrCategories);
      }
    } catch (error: any) {
      console.error('[SocialPage] Error fetching categories:', error);
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchActivities(), fetchParticipations(), fetchCategories(), fetchEsgSettings()]);
      setLoading(false);
    };
    initData();
  }, [fetchActivities, fetchParticipations, fetchCategories, fetchEsgSettings]);

  // Handle New Activity Submit
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCategoryId || !newDescription) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      const payload = {
        title: newTitle,
        categoryId: newCategoryId,
        description: newDescription,
        xpReward: newXpReward,
        evidenceRequired,
        deadline: newDeadline || null,
        maxParticipants: newMaxParticipants ? parseInt(newMaxParticipants) : null
      };

      const res = await api.post('/social', payload);
      if (res.data && res.data.success) {
        toast.success('Activity created.');
        setShowNewActivityModal(false);
        // Reset fields
        setNewTitle('');
        setNewCategoryId('');
        setNewDescription('');
        setNewXpReward(50);
        setNewDeadline('');
        setEvidenceRequired(false);
        setNewMaxParticipants('');
        // Refresh
        fetchActivities();
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to create activity.';
      toast.error(msg);
    }
  };

  // Handle Join Submit
  const handleJoinActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const activity = showJoinModal.activity;
    if (!activity) return;

    const evidenceRequiredForJoin = activity.evidenceRequired || (esgSettings ? esgSettings.evidenceRequired : true);

    if (evidenceRequiredForJoin && !proofFile) {
      toast.error('Proof file required');
      return;
    }

    try {
      const formData = new FormData();
      if (proofFile) {
        formData.append('proof', proofFile);
      }

      const res = await api.post(`/social/${activity.id}/join`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data && res.data.success) {
        toast.success('Joined! Pending approval.');
        setShowJoinModal({ open: false, activity: null });
        setProofFile(null);
        fetchActivities();
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to join activity.';
      toast.error(msg);
    }
  };

  // Handle Action Approval
  const handleApprove = async (id: string) => {
    try {
      const res = await api.patch(`/social/participations/${id}/approve`);
      if (res.data && res.data.success) {
        toast.success('Participation approved.');
        fetchParticipations();
        fetchActivities();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve participation.');
    }
  };

  // Handle Action Rejection
  const handleReject = async (id: string) => {
    try {
      const res = await api.patch(`/social/participations/${id}/reject`);
      if (res.data && res.data.success) {
        toast.success('Participation rejected.');
        fetchParticipations();
        fetchActivities();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject participation.');
    }
  };

  // Resolve dynamic proof URL paths
  const getProofDownloadUrl = (filename: string) => {
    const backendBase = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
    return `${backendBase}/uploads/${filename}`;
  };

  return (
    <div className="social-container" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Custom Styles */}
      <style>{`
        .glass-card {
          background: #ffffff;
          border: 1px solid rgba(25,53,12,0.10);
          border-radius: 14px;
          box-shadow: 0 1px 4px rgba(25,53,12,0.06), 0 2px 12px rgba(25,53,12,0.04);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(25,53,12,0.10);
        }
        .text-truncate-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
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
        .shimmer-anim {
          background: linear-gradient(90deg, #f0ede9 25%, #e8e4df 37%, #f0ede9 63%);
          background-size: 400% 100%;
          animation: shimmer-load 1.4s ease infinite;
        }
        @keyframes shimmer-load {
          0% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
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
      `}</style>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid rgba(25,53,12,0.10)', marginBottom: '2rem' }}>
        <button
          onClick={() => handleTabChange('activities')}
          className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
        >
          CSR Activities
        </button>
        {isAdminOrManager && (
          <button
            onClick={() => handleTabChange('approvals')}
            className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
          >
            Approval Queue
          </button>
        )}
        <button
          onClick={() => handleTabChange('diversity')}
          className={`tab-btn ${activeTab === 'diversity' ? 'active' : ''}`}
        >
          Diversity Dashboard
        </button>
      </div>

      {/* CSR ACTIVITIES TAB */}
      {activeTab === 'activities' && (
        <div>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ color: '#19350C', fontWeight: 700, fontSize: '1.375rem', margin: 0 }}>
                CSR Activities
              </h1>
              <p style={{ color: '#687D31', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                Join social responsibility programs and earn rewarding points.
              </p>
            </div>
            {isAdminOrManager && (
              <button
                onClick={() => setShowNewActivityModal(true)}
                style={{
                  background: '#687D31',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <Plus size={16} /> New Activity
              </button>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="shimmer-anim" style={{ height: '220px', borderRadius: '16px' }} />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b', marginTop: '1.5rem' }}>
              <Users size={32} style={{ marginBottom: '0.75rem', color: '#64748b' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No CSR activities published yet.</p>
            </div>
          ) : (
            /* Activities Grid */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
              {activities.map(act => {
                const isDeadlineMissed = act.deadline && new Date(act.deadline) < new Date();
                return (
                  <div key={act.id} className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Top accent line */}
                    <div style={{ height: '3px', background: '#687D31', width: '100%' }} />

                    {/* Card Content */}
                    <div style={{ padding: '1.125rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          background: 'rgba(104,125,49,0.12)',
                          color: '#687D31',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          borderRadius: '999px',
                          padding: '2px 9px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          {act.category?.name || 'CSR'}
                        </span>
                        {act.evidenceRequired && (
                          <span style={{
                            background: 'rgba(138,106,40,0.12)',
                            color: '#8A6A28',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            borderRadius: '999px',
                            padding: '2px 9px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            📎 Evidence Required
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 style={{ color: '#19350C', fontWeight: 600, fontSize: '0.9375rem', margin: 0, lineHeight: 1.3 }}>
                        {act.title}
                      </h3>

                      {/* Description */}
                      <p className="text-truncate-2" style={{ color: '#687D31', fontSize: '0.8125rem', margin: 0, lineHeight: 1.55, flex: 1 }}>
                        {act.description}
                      </p>

                      {/* Details row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.625rem', borderTop: '1px solid rgba(25,53,12,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8A6A28', fontSize: '0.8125rem', fontWeight: 600 }}>
                          <Award size={16} />
                          <span>⚡ {act.xpReward} XP</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#687D31', fontSize: '0.75rem' }}>
                          <Clock size={12} />
                          <span>
                            {act.deadline ? new Date(act.deadline).toLocaleDateString() : 'No Deadline'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom action button or status pill */}
                      <div style={{ marginTop: '0.5rem' }}>
                        {act.status === 'DRAFT' ? (
                          <div style={{
                            background: 'rgba(25,53,12,0.06)',
                            color: '#687D31',
                            padding: '0.45rem',
                            borderRadius: '7px',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            textAlign: 'center'
                          }}>
                            Draft
                          </div>
                        ) : act.joinStatus === 'PENDING' ? (
                          <div style={{
                            background: 'rgba(138,106,40,0.10)',
                            color: '#8A6A28',
                            padding: '0.45rem',
                            borderRadius: '7px',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            textAlign: 'center'
                          }}>
                            ⏳ Pending Approval
                          </div>
                        ) : act.joinStatus === 'APPROVED' ? (
                          <div style={{
                            background: 'rgba(104,125,49,0.12)',
                            color: '#687D31',
                            padding: '0.45rem',
                            borderRadius: '7px',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            textAlign: 'center'
                          }}>
                            ✅ Approved
                          </div>
                        ) : act.joinStatus === 'REJECTED' ? (
                          <div style={{
                            background: 'rgba(180,30,30,0.08)',
                            color: '#b44040',
                            padding: '0.45rem',
                            borderRadius: '7px',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            textAlign: 'center'
                          }}>
                            ❌ Rejected
                          </div>
                        ) : act.status === 'ACTIVE' && !isDeadlineMissed ? (
                          <button
                            onClick={() => setShowJoinModal({ open: true, activity: act })}
                            style={{
                              width: '100%',
                              background: '#687D31',
                              color: '#fff',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            Join Activity
                          </button>
                        ) : (
                          <div style={{
                            background: 'rgba(25,53,12,0.05)',
                            color: '#687D31',
                            padding: '0.45rem',
                            borderRadius: '7px',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            textAlign: 'center'
                          }}>
                            Activity Ended
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

      {/* APPROVAL QUEUE TAB (ADMIN/MANAGER ONLY) */}
      {activeTab === 'approvals' && isAdminOrManager && (
        <div className="glass-card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
          <h2 style={{ color: '#19350C', fontWeight: 800, fontSize: '1.25rem', marginBottom: '1.25rem', marginTop: 0 }}>
            Approval Queue
          </h2>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="shimmer-anim" style={{ height: '50px', borderRadius: '8px' }} />
              ))}
            </div>
          ) : participations.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#3D4A28' }}>
              <CheckCircle size={32} style={{ marginBottom: '0.5rem', color: '#22c55e' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>All queues are clear! No pending CSR approvals.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Activity</th>
                    <th>Proof</th>
                    <th>Points</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {participations.map(part => (
                    <tr key={part.id}>
                      <td style={{ color: '#19350C', fontWeight: 700 }}>
                        {part.employeeName}
                      </td>
                      <td style={{ color: '#3D4A28' }}>{part.activityTitle}</td>
                      <td>
                        {part.proofUrl ? (
                          <a
                            href={getProofDownloadUrl(part.proofUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#3d6c8a',
                              textDecoration: 'none',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FileText size={14} /> View Proof
                          </a>
                        ) : (
                          <span style={{ color: '#687D31', fontSize: '0.85rem' }}>No proof</span>
                        )}
                      </td>
                      <td style={{ color: '#f59e0b', fontWeight: 700 }}>
                        ⚡ {part.pointsEarned || 50}
                      </td>
                      <td>
                        <span style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#f59e0b',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: '999px',
                          padding: '2px 10px'
                        }}>
                          {part.approvalStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleApprove(part.id)}
                            style={{
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: '#22c55e',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(part.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'background-color 0.2s'
                            }}
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

      {/* DIVERSITY DASHBOARD TAB */}
      {activeTab === 'diversity' && (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={48} style={{ color: '#687D31', marginBottom: '1rem' }} />
          <h2 style={{ color: '#19350C', fontWeight: 800, fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>
            Diversity Dashboard
          </h2>
          <p style={{ color: '#3D4A28', fontSize: '0.9rem', maxWidth: '380px', margin: 0, lineHeight: 1.5 }}>
            Diversity metrics coming soon — powered by HR integration.
          </p>
        </div>
      )}


      {/* JOIN ACTIVITY MODAL */}
      {showJoinModal.open && showJoinModal.activity && (
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#ffffff', border: '1px solid rgba(25, 53, 12, 0.12)', boxShadow: '0 10px 30px rgba(25, 53, 12, 0.1)' }}>
            <div>
              <h2 style={{ color: '#19350C', fontWeight: 800, fontSize: '1.25rem', margin: 0 }}>
                Join Activity
              </h2>
              <p style={{ color: '#687D31', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Confirm your participation in <strong>{showJoinModal.activity.title}</strong>
              </p>
            </div>

            <form onSubmit={handleJoinActivity} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* File Upload Area */}
              {(showJoinModal.activity.evidenceRequired || (esgSettings ? esgSettings.evidenceRequired : true)) && (
                <div>
                  <label style={{ display: 'block', color: '#19350C', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Upload proof file *
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
                      padding: '2rem',
                      textAlign: 'center',
                      background: dragOver ? 'rgba(104, 125, 49, 0.08)' : 'rgba(25, 53, 12, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onClick={() => document.getElementById('modal-proof-input')?.click()}
                  >
                    <Upload size={28} style={{ color: '#687D31', marginBottom: '0.75rem' }} />
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#19350C' }}>
                      {proofFile ? proofFile.name : 'Upload proof file'}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#687D31' }}>
                      Drag & drop or click to select
                    </p>
                    <input
                      id="modal-proof-input"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal({ open: false, activity: null });
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
                  Join Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW ACTIVITY MODAL (ADMIN/MANAGER ONLY) */}
      {showNewActivityModal && isAdminOrManager && (
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.25rem', margin: 0 }}>
                Create CSR Activity
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Fill in the details to publish a new CSR drive.
              </p>
            </div>

            <form onSubmit={handleCreateActivity} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Title *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Tree Planting Drive"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Category */}
                <div>
                  <label style={{ display: 'block', color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Category *
                  </label>
                  <select
                    required
                    className="form-input"
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    style={{ background: 'rgba(0, 0, 0, 0.35)', color: '#f1f5f9' }}
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id} style={{ background: '#161a23' }}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* XP Reward */}
                <div>
                  <label style={{ display: 'block', color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    XP Reward *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    className="form-input"
                    value={newXpReward}
                    onChange={(e) => setNewXpReward(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Deadline */}
                <div>
                  <label style={{ display: 'block', color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                  />
                </div>

                {/* Max Participants */}
                <div>
                  <label style={{ display: 'block', color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Max Participants
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="form-input"
                    placeholder="e.g. 50 (Unlimited if blank)"
                    value={newMaxParticipants}
                    onChange={(e) => setNewMaxParticipants(e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  className="form-input"
                  placeholder="Provide activity details, location, and dates..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>

              {/* Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ display: 'block', color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600 }}>
                    Evidence File Required
                  </span>
                  <span style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>
                    Require employees to upload proof when joining.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEvidenceRequired(!evidenceRequired)}
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '24px',
                    borderRadius: '12px',
                    background: evidenceRequired ? '#3b82f6' : 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    padding: 0
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: evidenceRequired ? '26px' : '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s'
                    }}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowNewActivityModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#94a3b8',
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
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                  }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialPage;
