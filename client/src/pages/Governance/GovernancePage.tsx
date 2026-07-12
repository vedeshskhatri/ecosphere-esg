import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEsgStore } from '../../store/esgStore';
import api from '../../lib/api';
import { CheckSquare, Plus, Bell, AlertCircle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const GovernancePage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    policies, audits, complianceIssues, departments,
    fetchGovernanceData, acknowledgePolicy,
    createPolicy, createAudit, createComplianceIssue, updateComplianceIssueStatus 
  } = useEsgStore();

  useEffect(() => {
    fetchGovernanceData();
  }, [fetchGovernanceData]);

  // Tabs: Policies / Audits / Compliance
  const [activeSubTab, setActiveSubTab] = useState<'policies' | 'audits' | 'compliance'>('policies');
  
  // Policy Sub-tabs (Draft / Active / Archived)
  const [policyFilter, setPolicyFilter] = useState<'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ACTIVE');

  // Form states
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);

  // Policy Form
  const [pTitle, setPTitle] = useState('');
  const [pDescription, setPDescription] = useState('');
  const [pDeptId, setPDeptId] = useState('');
  const [pEffectiveDate, setPEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [pStatus, setPStatus] = useState<'DRAFT' | 'ACTIVE'>('ACTIVE');

  // Audit Form
  const [aTitle, setATitle] = useState('');
  const [aDeptId, setADeptId] = useState('');
  const [aAuditorId, setAAuditorId] = useState('');
  const [aDate, setADate] = useState('');
  const [aFindings, setAFindings] = useState('');

  // Issue Form
  const [iAuditId, setIAuditId] = useState('');
  const [iSeverity, setISeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [iDescription, setIDescription] = useState('');
  const [iOwnerId, setIOwnerId] = useState('');
  const [iDueDate, setIDueDate] = useState('');

  // Dynamic user lists for dropdown selection
  const [managers, setManagers] = useState<any[]>([]);
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await api.get('/gamification/leaderboard'); // fetches all active users
        setManagers(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchManagers();
  }, []);

  const handlePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pTitle || !pDescription) {
      toast.error('Policy title and description are required.');
      return;
    }
    await createPolicy({
      title: pTitle,
      description: pDescription,
      departmentId: pDeptId || null,
      effectiveDate: pEffectiveDate,
      status: pStatus,
    });
    setShowPolicyForm(false);
    setPTitle('');
    setPDescription('');
    setPDeptId('');
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aTitle || !aDeptId || !aAuditorId || !aDate) {
      toast.error('Please fill in all required fields.');
      return;
    }
    await createAudit({
      title: aTitle,
      departmentId: aDeptId,
      auditorId: aAuditorId,
      date: aDate,
      findings: aFindings,
      status: 'PLANNED',
    });
    setShowAuditForm(false);
    setATitle('');
    setADeptId('');
    setAAuditorId('');
    setADate('');
    setAFindings('');
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iDescription || !iOwnerId || !iDueDate) {
      toast.error('Description, owner, and due date are required.');
      return;
    }
    await createComplianceIssue({
      auditId: iAuditId || null,
      severity: iSeverity,
      description: iDescription,
      ownerId: iOwnerId,
      dueDate: iDueDate,
    });
    setShowIssueForm(false);
    setIAuditId('');
    setIDescription('');
    setIOwnerId('');
    setIDueDate('');
  };

  const sendPolicyReminder = (_policyId: string) => {
    toast.success('Acknowledgement reminders dispatched!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Corporate Governance
          </h1>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Corporate policy compliance check-ins, scheduled audit calendars, and high-severity SLA trackers.
          </span>
        </div>
        
        {/* Module Sub-tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button onClick={() => setActiveSubTab('policies')} className="btn" style={{ padding: '0.4rem 0.875rem', border: 'none', backgroundColor: activeSubTab === 'policies' ? 'var(--bg-input)' : 'transparent', color: activeSubTab === 'policies' ? 'var(--gov)' : 'var(--text-secondary)' }}>
            Policies
          </button>
          <button onClick={() => setActiveSubTab('audits')} className="btn" style={{ padding: '0.4rem 0.875rem', border: 'none', backgroundColor: activeSubTab === 'audits' ? 'var(--bg-input)' : 'transparent', color: activeSubTab === 'audits' ? 'var(--gov)' : 'var(--text-secondary)' }}>
            Audits
          </button>
          <button onClick={() => setActiveSubTab('compliance')} className="btn" style={{ padding: '0.4rem 0.875rem', border: 'none', backgroundColor: activeSubTab === 'compliance' ? 'var(--bg-input)' : 'transparent', color: activeSubTab === 'compliance' ? 'var(--gov)' : 'var(--text-secondary)' }}>
            Compliance
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          POLICIES TAB
          ───────────────────────────────────────── */}
      {activeSubTab === 'policies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: '700' }}>ESG Regulatory Policies</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {user?.role !== 'EMPLOYEE' && (
                <>
                  <select className="input" style={{ width: '120px', padding: '0.4rem' }} value={policyFilter} onChange={(e: any) => setPolicyFilter(e.target.value)}>
                    <option value="ACTIVE">Active</option>
                    <option value="DRAFT">Drafts</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                  <button onClick={() => setShowPolicyForm(!showPolicyForm)} className="btn btn-primary" style={{ padding: '0.45rem 1rem' }}>
                    <Plus size={16} /> Draft Policy
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Draft policy Form */}
          {showPolicyForm && (
            <div className="card" style={{ borderLeft: '4px solid var(--gov)' }}>
              <h3 style={{ marginBottom: '1rem' }}>Draft ESG Compliance Policy</h3>
              <form onSubmit={handlePolicySubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="label">Policy Title</label>
                  <input type="text" className="input" placeholder="e.g. Wastewater Recycling Standard" value={pTitle} onChange={(e) => setPTitle(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Applicable Department</label>
                  <select className="input" value={pDeptId} onChange={(e) => setPDeptId(e.target.value)}>
                    <option value="">Global (All Departments)</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Effective Date</label>
                  <input type="date" className="input" value={pEffectiveDate} onChange={(e) => setPEffectiveDate(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={pStatus} onChange={(e: any) => setPStatus(e.target.value)}>
                    <option value="ACTIVE">Active (Requires Acknowledgement)</option>
                    <option value="DRAFT">Draft (Internal Review)</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Description / Mandate</label>
                  <textarea className="input" rows={3} placeholder="Outline standard operating procedures, thresholds and goals..." value={pDescription} onChange={(e) => setPDescription(e.target.value)} required />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowPolicyForm(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Policy</button>
                </div>
              </form>
            </div>
          )}

          {/* Policies Checklist Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {policies.filter((p) => p.status === policyFilter).length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No policies found matching filter selection.
              </div>
            ) : (
              policies.filter((p) => p.status === policyFilter).map((policy) => {
                const isEmployee = user?.role === 'EMPLOYEE';
                const userAck = policy.acknowledgements?.find((a: any) => a.employeeId === user?.id);
                const isAck = userAck?.status === 'ACKNOWLEDGED';
                const totalAck = policy.acknowledgements?.filter((a: any) => a.status === 'ACKNOWLEDGED').length || 0;
                const totalExpected = policy.acknowledgements?.length || 0;

                return (
                  <div key={policy.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${isAck ? 'var(--status-active)' : 'var(--gov)'}` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: '75%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: '700' }}>{policy.title}</h4>
                        <span className="badge badge--draft">{policy.department?.name || 'Global'}</span>
                      </div>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{policy.description}</p>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Effective Date: {new Date(policy.effectiveDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                      {isEmployee ? (
                        isAck ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-active)', fontSize: 'var(--text-sm)', fontWeight: '600' }}>
                            <ShieldCheck size={18} />
                            <span>Acknowledged</span>
                          </div>
                        ) : (
                          <button onClick={() => acknowledgePolicy(policy.id)} className="btn btn-primary" style={{ padding: '0.4rem 1rem' }}>
                            Acknowledge
                          </button>
                        )
                      ) : (
                        // Managers see stats and Nudge Reminder button
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                            Acknowledgements: <strong>{totalAck} / {totalExpected}</strong>
                          </span>
                          {policy.status === 'ACTIVE' && totalExpected > totalAck && (
                            <button onClick={() => sendPolicyReminder(policy.id)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', gap: '4px' }}>
                              <Bell size={14} /> Remind Employees
                            </button>
                          )}
                        </div>
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
          AUDITS TAB
          ───────────────────────────────────────── */}
      {activeSubTab === 'audits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: '700' }}>Department Audit Calendars</h3>
            {user?.role !== 'EMPLOYEE' && (
              <button onClick={() => setShowAuditForm(!showAuditForm)} className="btn btn-primary">
                <Plus size={16} /> Schedule Audit
              </button>
            )}
          </div>

          {/* Audit Scheduling form */}
          {showAuditForm && (
            <div className="card" style={{ borderLeft: '4px solid var(--gov)' }}>
              <h3 style={{ marginBottom: '1rem' }}>Schedule Internal Department Audit</h3>
              <form onSubmit={handleAuditSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="label">Audit Title</label>
                  <input type="text" className="input" placeholder="e.g. Q3 Energy Efficiency Audit" value={aTitle} onChange={(e) => setATitle(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Audited Department</label>
                  <select className="input" value={aDeptId} onChange={(e) => setADeptId(e.target.value)} required>
                    <option value="">Select Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Assigned Auditor</label>
                  <select className="input" value={aAuditorId} onChange={(e) => setAAuditorId(e.target.value)} required>
                    <option value="">Select Auditor</option>
                    {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Audit Date</label>
                  <input type="date" className="input" value={aDate} onChange={(e) => setADate(e.target.value)} required />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Findings / Scope Details</label>
                  <textarea className="input" rows={2} placeholder="Findings details or scope outlines..." value={aFindings} onChange={(e) => setAFindings(e.target.value)} />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowAuditForm(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Schedule Audit</button>
                </div>
              </form>
            </div>
          )}

          {/* Audit List */}
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Audit Title</th>
                  <th>Department</th>
                  <th>Auditor</th>
                  <th>Audit Date</th>
                  <th>Findings Summary</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {audits.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No audits scheduled yet.
                    </td>
                  </tr>
                ) : (
                  audits.map((audit) => (
                    <tr key={audit.id}>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{audit.title}</td>
                      <td>{audit.department.name}</td>
                      <td>{audit.auditor.name}</td>
                      <td>{new Date(audit.date).toLocaleDateString()}</td>
                      <td>{audit.findings || '—'}</td>
                      <td>
                        <span className={`badge ${audit.status === 'COMPLETED' ? 'badge--active' : audit.status === 'IN_PROGRESS' ? 'badge--pending' : 'badge--draft'}`}>
                          {audit.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          COMPLIANCE TAB
          ───────────────────────────────────────── */}
      {activeSubTab === 'compliance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: '700' }}>Compliance Issues SLA Watcher</h3>
            {user?.role !== 'EMPLOYEE' && (
              <button onClick={() => setShowIssueForm(!showIssueForm)} className="btn btn-primary">
                <Plus size={16} /> Log Compliance Issue
              </button>
            )}
          </div>

          {/* Log compliance issue Form */}
          {showIssueForm && (
            <div className="card" style={{ borderLeft: '4px solid var(--severity-high)' }}>
              <h3 style={{ marginBottom: '1rem' }}>Raise ESG Compliance Issue</h3>
              <form onSubmit={handleIssueSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="label">Audit Reference (Optional)</label>
                  <select className="input" value={iAuditId} onChange={(e) => setIAuditId(e.target.value)}>
                    <option value="">General Issue (No Audit)</option>
                    {audits.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Severity Level</label>
                  <select className="input" value={iSeverity} onChange={(e: any) => setISeverity(e.target.value)} required>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="label">Assigned Owner</label>
                  <select className="input" value={iOwnerId} onChange={(e) => setIOwnerId(e.target.value)} required>
                    <option value="">Select Action Owner</option>
                    {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">SLA Due Date</label>
                  <input type="date" className="input" value={iDueDate} onChange={(e) => setIDueDate(e.target.value)} required />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Compliance Deviation Description</label>
                  <textarea className="input" rows={2} placeholder="Detail the non-compliance incident or missing certification..." value={iDescription} onChange={(e) => setIDescription(e.target.value)} required />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowIssueForm(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Raise Issue</button>
                </div>
              </form>
            </div>
          )}

          {/* Compliance List */}
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Incident Description</th>
                  <th>Department / Source</th>
                  <th>Action Owner</th>
                  <th>SLA Due Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {complianceIssues.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No active compliance issues logged. System fully compliant!
                    </td>
                  </tr>
                ) : (
                  complianceIssues.map((issue) => {
                    const isOverdue = issue.isOverdue && issue.status !== 'RESOLVED';
                    const canResolve = user?.role !== 'EMPLOYEE' || user.id === issue.ownerId;

                    return (
                      <tr key={issue.id} style={{ backgroundColor: isOverdue ? 'rgba(239,68,68,0.02)' : 'transparent' }}>
                        <td>
                          <span className={`badge ${issue.severity === 'CRITICAL' ? 'badge--critical' : issue.severity === 'HIGH' ? 'badge--high' : issue.severity === 'MEDIUM' ? 'badge--pending' : 'badge--active'}`}>
                            {issue.severity}
                          </span>
                        </td>
                        <td style={{ fontWeight: '500', color: isOverdue ? 'var(--severity-high)' : 'var(--text-primary)' }}>
                          {issue.description}
                          {isOverdue && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--severity-high)', fontSize: '10px', marginTop: '4px', fontWeight: 'bold' }}>
                              <AlertCircle size={10} /> SLA OVERDUE
                            </span>
                          )}
                        </td>
                        <td>{issue.audit?.department?.name || 'Global'}</td>
                        <td>{issue.owner.name}</td>
                        <td>{new Date(issue.dueDate).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${issue.status === 'RESOLVED' ? 'badge--active' : issue.status === 'IN_PROGRESS' ? 'badge--pending' : 'badge--high'}`}>
                            {issue.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            {issue.status !== 'RESOLVED' && canResolve && (
                              <button onClick={() => updateComplianceIssueStatus(issue.id, 'RESOLVED')} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', gap: '4px', color: 'var(--status-active)' }}>
                                <CheckSquare size={14} /> Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovernancePage;
