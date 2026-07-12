import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEsgStore } from '../../store/esgStore';
import api from '../../lib/api';
import { Users, Award, FileText, Check, X, ShieldAlert, Plus, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export const SocialPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    activities, categories, pendingParticipations,
    fetchSocialData, joinActivity, approveParticipation, rejectParticipation
  } = useEsgStore();

  useEffect(() => {
    fetchSocialData(user?.role);
  }, [fetchSocialData, user?.role]);

  // Form toggles
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joiningActivityId, setJoiningActivityId] = useState<string | null>(null);

  // Creation State
  const [title, setTitle] = useState('');
  const [catId, setCatId] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceRequired, setEvidenceRequired] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [xpReward, setXpReward] = useState('50');
  const [deadline, setDeadline] = useState('');

  // Joining states
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  // Rejection Notes modal state
  const [rejectingPartId, setRejectingPartId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !catId || !description || !xpReward) {
      toast.error('All fields marked * are required.');
      return;
    }

    try {
      await api.post('/social/activities', {
        title,
        categoryId: catId,
        description,
        evidenceRequired,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        xpReward: parseInt(xpReward),
        deadline: deadline || null,
      });
      toast.success('CSR Activity created successfully!');
      setShowCreateForm(false);
      setTitle('');
      setCatId('');
      setDescription('');
      setEvidenceRequired(false);
      setMaxParticipants('');
      setXpReward('50');
      setDeadline('');
      fetchSocialData(user?.role);
    } catch (err) {
      // Axios error interceptor handles toasts
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joiningActivityId) return;

    const activity = activities.find((a) => a.id === joiningActivityId);
    if (activity?.evidenceRequired && !proofFile) {
      toast.error('Evidence file is required to join this activity!');
      return;
    }

    await joinActivity(joiningActivityId, proofFile, notes);
    setJoiningActivityId(null);
    setProofFile(null);
    setNotes('');
  };

  const triggerReject = async (partId: string) => {
    if (!rejectionNotes.trim()) {
      toast.error('Please enter a reason for rejection.');
      return;
    }
    await rejectParticipation(partId, rejectionNotes);
    setRejectingPartId(null);
    setRejectionNotes('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Social Responsibility
          </h1>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Join volunteer drives, log ESG hours, and earn recognition rewards.
          </span>
        </div>
        {user?.role !== 'EMPLOYEE' && (
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary">
            <Plus size={16} /> Create Activity
          </button>
        )}
      </div>

      {/* Creation Form */}
      {showCreateForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--social)' }}>
          <h3 style={{ marginBottom: '1.25rem' }}>Create CSR Activity</h3>
          <form onSubmit={handleCreateSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="label">Activity Title *</label>
              <input type="text" className="input" placeholder="e.g. Tree Planting Drive" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div>
              <label className="label">Category *</label>
              <select className="input" value={catId} onChange={(e) => setCatId(e.target.value)} required>
                <option value="">Select Category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">XP Reward *</label>
              <input type="number" className="input" placeholder="e.g. 50" value={xpReward} onChange={(e) => setXpReward(e.target.value)} required />
            </div>

            <div>
              <label className="label">Max Participants</label>
              <input type="number" className="input" placeholder="e.g. 10 (Leave blank for unlimited)" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} />
            </div>

            <div>
              <label className="label">Deadline</label>
              <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.5rem', gap: '0.5rem' }}>
              <input type="checkbox" id="evidenceRequired" checked={evidenceRequired} onChange={(e) => setEvidenceRequired(e.target.checked)} style={{ width: '16px', height: '16px' }} />
              <label htmlFor="evidenceRequired" style={{ fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Evidence File Required to Complete
              </label>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Description *</label>
              <textarea className="input" rows={3} placeholder="Provide details on the event, location, and timeline..." value={description} onChange={(e) => setDescription(e.target.value)} required style={{ resize: 'vertical' }} />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Publish Activity</button>
            </div>
          </form>
        </div>
      )}

      {/* Join Evidence Submission Modal Form overlay style inline */}
      {joiningActivityId && (
        <div className="card" style={{ borderLeft: '4px solid var(--gamify)', maxWidth: '480px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Confirm Participation</h3>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '1.25rem' }}>
            Upload evidence and notes below to submit your join request.
          </span>
          <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label">Attach Proof (Image/PDF) *</label>
              <input 
                type="file" 
                className="input" 
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                required={activities.find((a) => a.id === joiningActivityId)?.evidenceRequired}
              />
            </div>
            <div>
              <label className="label">Notes / Details</label>
              <textarea className="input" rows={2} placeholder="E.g. Completed 2 hours of packing donations." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setJoiningActivityId(null)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Submit Join Request</button>
            </div>
          </form>
        </div>
      )}

      {/* Managers Queue pending approvals */}
      {user?.role !== 'EMPLOYEE' && pendingParticipations.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--status-pending)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="var(--status-pending)" /> CSR Approvals Queue ({pendingParticipations.length} Pending)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>CSR Activity</th>
                  <th>Evidence Proof</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingParticipations.map((part) => (
                  <tr key={part.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{part.employee.name}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{part.employee.email}</span>
                      </div>
                    </td>
                    <td>{part.employee.department?.name || 'N/A'}</td>
                    <td>{part.activity.title}</td>
                    <td>
                      {part.proofUrl ? (
                        <a href={`http://localhost:5001${part.proofUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--social)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                          <FileText size={14} /> View Evidence
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>No File Provided</span>
                      )}
                    </td>
                    <td>{part.notes || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {rejectingPartId === part.id ? (
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              className="input" 
                              placeholder="Reason..." 
                              style={{ padding: '0.25rem', width: '120px', fontSize: 'var(--text-xs)' }}
                              value={rejectionNotes}
                              onChange={(e) => setRejectionNotes(e.target.value)}
                            />
                            <button onClick={() => triggerReject(part.id)} className="btn btn-danger" style={{ padding: '0.25rem' }}><Check size={12} /></button>
                            <button onClick={() => setRejectingPartId(null)} className="btn btn-secondary" style={{ padding: '0.25rem' }}><X size={12} /></button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => approveParticipation(part.id)} className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem', color: 'var(--status-active)' }}>
                              <Check size={14} /> Approve
                            </button>
                            <button onClick={() => setRejectingPartId(part.id)} className="btn btn-danger" style={{ padding: '0.35rem 0.5rem' }}>
                              <X size={14} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid of CSR Activity Cards */}
      <div>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: '1.25rem' }}>Open CSR Volunteering Drives</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {activities.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No CSR activities published yet.
            </div>
          ) : (
            activities.map((act) => {
              const userPart = act.participations.find((p: any) => p.employeeId === user?.id);
              const approvedCount = act.participations.filter((p: any) => p.approvalStatus === 'APPROVED').length;
              const hasJoined = !!userPart;

              return (
                <div key={act.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '3px solid var(--social)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--social)', textTransform: 'uppercase' }}>
                      {act.category?.name}
                    </span>
                    {userPart && (
                      <span className={`badge ${userPart.approvalStatus === 'APPROVED' ? 'badge--active' : userPart.approvalStatus === 'PENDING' ? 'badge--pending' : 'badge--high'}`}>
                        {userPart.approvalStatus}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '700', color: 'var(--text-primary)', marginTop: '-0.25rem' }}>
                    {act.title}
                  </h3>

                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', flex: 1, lineBreak: 'anywhere' }}>
                    {act.description}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} />
                      <span>{act.deadline ? new Date(act.deadline).toLocaleDateString() : 'No Limit'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} />
                      <span>{approvedCount} / {act.maxParticipants || '∞'} Joined</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-sm)', fontWeight: '700', color: 'var(--gamify)' }}>
                      <Award size={16} />
                      <span>+{act.xpReward} XP</span>
                    </div>
                    
                    {!hasJoined && user?.role === 'EMPLOYEE' && (
                      <button 
                        onClick={() => setJoiningActivityId(act.id)} 
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 1rem' }}
                      >
                        Join Drive
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialPage;
