import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEsgStore } from '../../store/esgStore';
import api from '../../lib/api';
import { Trophy, Flame, Plus, ShieldAlert, Check, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const GamificationPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    challenges, rewards, leaderboard, pendingChallengeCompletions,
    fetchGamificationData, joinChallenge, updateChallengeProgress, 
    approveChallengeCompletion, rejectChallengeCompletion, redeemReward 
  } = useEsgStore();

  useEffect(() => {
    fetchGamificationData(user?.role);
  }, [fetchGamificationData, user?.role]);

  // Main Sub-tabs: Challenges / Badges / Rewards / Leaderboard
  const [activeSubTab, setActiveSubTab] = useState<'challenges' | 'badges' | 'rewards' | 'leaderboard'>('challenges');

  // Challenge Kanban status tab Filter (ACTIVE / DRAFT / UNDER_REVIEW / COMPLETED)
  const [challengeFilter, setChallengeFilter] = useState<'ACTIVE' | 'DRAFT' | 'COMPLETED'>('ACTIVE');

  // Modal forms
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [progressChallengeId, setProgressChallengeId] = useState<string | null>(null);
  
  // Create Challenge states
  const [cTitle, setCTitle] = useState('');
  const [cCatId, setCCatId] = useState('');
  const [cDescription, setCDescription] = useState('');
  const [cXp, setCXp] = useState('100');
  const [cDifficulty, setCDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [cEvidence, setCEvidence] = useState(false);
  const [cDeadline, setCDeadline] = useState('');

  // Update progress states
  const [progressVal, setProgressVal] = useState('100');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [progressNotes, setProgressNotes] = useState('');

  // Rejection notes modal
  const [rejectingCompId, setRejectingCompId] = useState<string | null>(null);
  const [reversionNotes, setReversionNotes] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/settings/categories');
        setCategories(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCats();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cTitle || !cCatId || !cDescription || !cXp) {
      toast.error('Please fill in all required fields.');
      return;
    }
    try {
      await api.post('/gamification/challenges', {
        title: cTitle,
        categoryId: cCatId,
        description: cDescription,
        xp: parseInt(cXp),
        difficulty: cDifficulty,
        evidenceRequired: cEvidence,
        deadline: cDeadline || null,
      });
      toast.success('Challenge drafted successfully!');
      setShowCreateForm(false);
      setCTitle('');
      setCCatId('');
      setCDescription('');
      setCXp('100');
      setCDifficulty('MEDIUM');
      setCEvidence(false);
      setCDeadline('');
      fetchGamificationData(user?.role);
    } catch (err) {
      // Handled globally
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressChallengeId) return;

    await updateChallengeProgress(
      progressChallengeId,
      parseInt(progressVal),
      proofFile,
      progressNotes
    );
    setProgressChallengeId(null);
    setProofFile(null);
    setProgressNotes('');
  };

  const triggerReject = async (compId: string) => {
    if (!reversionNotes.trim()) {
      toast.error('Rejection notes are required');
      return;
    }
    await rejectChallengeCompletion(compId, reversionNotes);
    setRejectingCompId(null);
    setReversionNotes('');
  };

  const handleRedeem = async (rewardId: string, cost: number, stock: number) => {
    if (stock <= 0) {
      toast.error('Out of stock!');
      return;
    }
    if ((user?.pointsBalance || 0) < cost) {
      toast.error('Insufficient points balance.');
      return;
    }
    await redeemReward(rewardId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Gamification Center
          </h1>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Complete eco-challenges, unlock milestone badges, and redeem real reward merchandise.
          </span>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button onClick={() => setActiveSubTab('challenges')} className="btn" style={{ padding: '0.4rem 0.875rem', border: 'none', backgroundColor: activeSubTab === 'challenges' ? 'var(--bg-input)' : 'transparent', color: activeSubTab === 'challenges' ? 'var(--gamify)' : 'var(--text-secondary)' }}>
            Challenges
          </button>
          <button onClick={() => setActiveSubTab('badges')} className="btn" style={{ padding: '0.4rem 0.875rem', border: 'none', backgroundColor: activeSubTab === 'badges' ? 'var(--bg-input)' : 'transparent', color: activeSubTab === 'badges' ? 'var(--gamify)' : 'var(--text-secondary)' }}>
            Badges
          </button>
          <button onClick={() => setActiveSubTab('rewards')} className="btn" style={{ padding: '0.4rem 0.875rem', border: 'none', backgroundColor: activeSubTab === 'rewards' ? 'var(--bg-input)' : 'transparent', color: activeSubTab === 'rewards' ? 'var(--gamify)' : 'var(--text-secondary)' }}>
            Rewards Store
          </button>
          <button onClick={() => setActiveSubTab('leaderboard')} className="btn" style={{ padding: '0.4rem 0.875rem', border: 'none', backgroundColor: activeSubTab === 'leaderboard' ? 'var(--bg-input)' : 'transparent', color: activeSubTab === 'leaderboard' ? 'var(--gamify)' : 'var(--text-secondary)' }}>
            Leaderboard
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          CHALLENGES TAB
          ───────────────────────────────────────── */}
      {activeSubTab === 'challenges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header & filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: '700' }}>Kanban Challenges Board</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <select className="input" style={{ width: '120px', padding: '0.4rem' }} value={challengeFilter} onChange={(e: any) => setChallengeFilter(e.target.value)}>
                <option value="ACTIVE">Active</option>
                {user?.role !== 'EMPLOYEE' && <option value="DRAFT">Drafts</option>}
                <option value="COMPLETED">Completed</option>
              </select>
              {user?.role !== 'EMPLOYEE' && (
                <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary" style={{ padding: '0.45rem 1rem' }}>
                  <Plus size={16} /> Draft Challenge
                </button>
              )}
            </div>
          </div>

          {/* Create Challenge Form */}
          {showCreateForm && (
            <div className="card" style={{ borderLeft: '4px solid var(--gamify)' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>Draft Eco-Challenge</h3>
              <form onSubmit={handleCreateSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="label">Challenge Title *</label>
                  <input type="text" className="input" placeholder="e.g. Bring Organic Lunch Week" value={cTitle} onChange={(e) => setCTitle(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Category *</label>
                  <select className="input" value={cCatId} onChange={(e) => setCCatId(e.target.value)} required>
                    <option value="">Select Category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">XP Value *</label>
                  <input type="number" className="input" placeholder="e.g. 100" value={cXp} onChange={(e) => setCXp(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Difficulty *</label>
                  <select className="input" value={cDifficulty} onChange={(e: any) => setCDifficulty(e.target.value)} required>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="label">Deadline</label>
                  <input type="date" className="input" value={cDeadline} onChange={(e) => setCDeadline(e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.5rem', gap: '0.5rem' }}>
                  <input type="checkbox" id="cEvidence" checked={cEvidence} onChange={(e) => setCEvidence(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                  <label htmlFor="cEvidence" style={{ fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Evidence Proof Required
                  </label>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Challenge Description *</label>
                  <textarea className="input" rows={2} placeholder="Explain the guidelines, constraints, and target behaviors..." value={cDescription} onChange={(e) => setCDescription(e.target.value)} required />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Challenge</button>
                </div>
              </form>
            </div>
          )}

          {/* Update Progress Modal */}
          {progressChallengeId && (
            <div className="card" style={{ borderLeft: '4px solid var(--env)', maxWidth: '480px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Log Challenge Completion</h3>
              <form onSubmit={handleProgressSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="label">Completion Progress (%) *</label>
                  <input type="number" min="0" max="100" className="input" value={progressVal} onChange={(e) => setProgressVal(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Attach Evidence Document (Image/PDF)</label>
                  <input type="file" className="input" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <label className="label">Action notes</label>
                  <textarea className="input" rows={2} placeholder="Detail actions completed..." value={progressNotes} onChange={(e) => setProgressNotes(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setProgressChallengeId(null)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Update Progress</button>
                </div>
              </form>
            </div>
          )}

          {/* Pending Challenge approvals Queue (Managers only) */}
          {user?.role !== 'EMPLOYEE' && pendingChallengeCompletions.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--status-pending)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="var(--status-pending)" /> Challenge Approvals Queue ({pendingChallengeCompletions.length} Pending)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Challenge Title</th>
                      <th>Difficulty</th>
                      <th>Evidence Proof</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingChallengeCompletions.map((comp) => (
                      <tr key={comp.id}>
                        <td>{comp.employee.name} ({comp.employee.department?.name || 'N/A'})</td>
                        <td>{comp.challenge.title}</td>
                        <td>{comp.challenge.difficulty}</td>
                        <td>
                          {comp.proofUrl ? (
                            <a href={`http://localhost:5001${comp.proofUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--social)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <FileText size={14} /> View Evidence
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>No File Provided</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            {rejectingCompId === comp.id ? (
                              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                <input type="text" className="input" placeholder="Reason..." style={{ padding: '0.25rem', width: '120px', fontSize: 'var(--text-xs)' }} value={reversionNotes} onChange={(e) => setReversionNotes(e.target.value)} />
                                <button onClick={() => triggerReject(comp.id)} className="btn btn-danger" style={{ padding: '0.25rem' }}><Check size={12} /></button>
                                <button onClick={() => setRejectingCompId(null)} className="btn btn-secondary" style={{ padding: '0.25rem' }}><X size={12} /></button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => approveChallengeCompletion(comp.id)} className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem', color: 'var(--status-active)' }}><Check size={14} /> Approve</button>
                                <button onClick={() => setRejectingCompId(comp.id)} className="btn btn-danger" style={{ padding: '0.35rem 0.5rem' }}><X size={14} /> Reject</button>
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

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {challenges.filter((c) => c.status === challengeFilter).length === 0 ? (
              <div className="card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No challenges found matching selection.
              </div>
            ) : (
              challenges.filter((c) => c.status === challengeFilter).map((ch) => {
                const userPart = ch.participations?.find((p: any) => p.employeeId === user?.id);
                const hasJoined = !!userPart;
                const isApproved = userPart?.approvalStatus === 'APPROVED';

                return (
                  <div key={ch.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '3px solid var(--gamify)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className={`badge ${ch.difficulty === 'HARD' ? 'badge--high' : ch.difficulty === 'MEDIUM' ? 'badge--pending' : 'badge--active'}`}>
                        {ch.difficulty}
                      </span>
                      {userPart && (
                        <span className={`badge ${isApproved ? 'badge--active' : 'badge--pending'}`}>
                          {isApproved ? 'Completed' : `Joined (${userPart.progress}%)`}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '700', color: 'var(--text-primary)', marginTop: '-0.25rem' }}>
                      {ch.title}
                    </h3>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', flex: 1, lineBreak: 'anywhere' }}>
                      {ch.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-sm)', fontWeight: '700', color: 'var(--gamify)' }}>
                        <Flame size={16} />
                        <span>+{ch.xp} XP / pts</span>
                      </div>

                      {user?.role === 'EMPLOYEE' && ch.status === 'ACTIVE' && (
                        !hasJoined ? (
                          <button onClick={() => joinChallenge(ch.id)} className="btn btn-primary" style={{ padding: '0.4rem 1rem' }}>
                            Join Challenge
                          </button>
                        ) : (
                          !isApproved && (
                            <button onClick={() => setProgressChallengeId(ch.id)} className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>
                              Log progress
                            </button>
                          )
                        )
                      )}
                      
                      {/* Managers see active drafting triggers */}
                      {user?.role !== 'EMPLOYEE' && ch.status === 'DRAFT' && (
                        <button onClick={async () => {
                          await api.put(`/gamification/challenges/${ch.id}/status`, { status: 'ACTIVE' });
                          toast.success('Challenge published successfully!');
                          fetchGamificationData(user?.role);
                        }} className="btn btn-primary" style={{ padding: '0.4rem 1rem' }}>
                          Activate Challenge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          BADGES TAB
          ───────────────────────────────────────── */}
      {activeSubTab === 'badges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: '700' }}>ESG Milestone Achievements</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* Seeded badges catalog */}
            {[
              { id: '1', name: 'Eco Enthusiast', description: 'Crossed 500 XP threshold', icon: '✨', rule: 'XP >= 500' },
              { id: '2', name: 'Green Volunteer', description: 'Participated in 2 CSR activities', icon: '❤️', rule: 'CSR Counts >= 2' },
              { id: '3', name: 'Carbon Buster', description: 'Completed 3 eco challenges', icon: '🛡️', rule: 'Challenge completions >= 3' }
            ].map((badge) => {
              // Check if user has this badge
              const userAwards = leaderboard.find((u) => u.id === user?.id)?.xp || 0;
              const hasUnlocked = 
                (badge.id === '1' && userAwards >= 500) ||
                (badge.id === '2' && leaderboard.find((u) => u.id === user?.id)?.pointsBalance >= 100) ||
                false;

              return (
                <div key={badge.id} className="card" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.25rem', 
                  opacity: hasUnlocked ? 1 : 0.45,
                  border: `1px solid ${hasUnlocked ? 'var(--gamify)' : 'var(--border)'}`,
                  background: hasUnlocked ? 'rgba(249,115,22,0.03)' : 'rgba(22,26,35,0.85)'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: hasUnlocked ? 'var(--gamify-glow)' : 'var(--bg-input)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    boxShadow: hasUnlocked ? '0 0 16px var(--gamify-glow)' : 'none'
                  }}>
                    {badge.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: 'var(--text-lg)', fontWeight: '700', color: 'var(--text-primary)' }}>{badge.name}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{badge.description}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      Requirement: {badge.rule} {hasUnlocked && '✓'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          REWARDS STORE TAB
          ───────────────────────────────────────── */}
      {activeSubTab === 'rewards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: '700' }}>Platform Reward Store</h3>
            {user?.role === 'EMPLOYEE' && (
              <span className="badge badge--active" style={{ padding: '0.5rem 1rem', fontSize: 'var(--text-sm)' }}>
                Your Points Balance: <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>{user.pointsBalance} pts</strong>
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {rewards.map((reward) => (
              <div key={reward.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '3px solid var(--env)' }}>
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: '700', color: 'var(--text-primary)' }}>{reward.name}</h4>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', flex: 1 }}>{reward.description}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>Stock remaining: <strong>{reward.stock} units</strong></span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: '800', color: 'var(--env)' }}>{reward.pointsRequired} pts</span>
                </div>

                {user?.role === 'EMPLOYEE' && (
                  <button 
                    onClick={() => handleRedeem(reward.id, reward.pointsRequired, reward.stock)} 
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.625rem', fontWeight: 'bold' }}
                    disabled={reward.stock <= 0 || user.pointsBalance < reward.pointsRequired}
                  >
                    {reward.stock <= 0 ? 'Out of Stock' : 'Redeem Item'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          LEADERBOARD TAB
          ───────────────────────────────────────── */}
      {activeSubTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trophy size={20} color="var(--gamify)" /> Organization ESG Leaderboard
          </h3>

          <div className="card" style={{ padding: '0 1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Rank</th>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Points Balance</th>
                  <th style={{ textAlign: 'right' }}>Total XP Earned</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((item, idx) => {
                  const isSelf = item.id === user?.id;

                  return (
                    <tr key={item.id} style={{ backgroundColor: isSelf ? 'rgba(249,115,22,0.04)' : 'transparent' }}>
                      <td style={{ fontWeight: '800', fontSize: 'var(--text-lg)', color: idx === 0 ? 'var(--gamify)' : idx === 1 ? 'var(--social)' : idx === 2 ? 'var(--env)' : 'var(--text-muted)' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ fontWeight: isSelf ? '700' : 'normal', color: isSelf ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {item.name} {isSelf && ' (You)'}
                      </td>
                      <td>{item.department?.name || 'Unassigned'}</td>
                      <td>{item.pointsBalance} pts</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--gamify)' }}>
                        {item.xp} XP
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamificationPage;
