import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEsgStore } from '../../store/esgStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export const EnvironmentalPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    emissionFactors, transactions, goals, departments,
    fetchEnvironmentalData, logTransaction, createGoal, updateGoalProgress 
  } = useEsgStore();

  useEffect(() => {
    fetchEnvironmentalData();
  }, [fetchEnvironmentalData]);

  // Form states
  const [showLogForm, setShowLogForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  
  // Transaction Form
  const [deptId, setDeptId] = useState('');
  const [factorId, setFactorId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sourceType, setSourceType] = useState('Fleet');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Goal Form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDeptId, setGoalDeptId] = useState('');
  const [targetCo2, setTargetCo2] = useState('');
  const [deadline, setDeadline] = useState('');

  // Inline Goal Progress Update
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [incrementVal, setIncrementVal] = useState('');

  // Auto-fill employee department if restricted
  useEffect(() => {
    if (user && user.role === 'EMPLOYEE' && user.departmentId) {
      setDeptId(user.departmentId);
      setGoalDeptId(user.departmentId);
    }
  }, [user]);

  // 1. Group transactions for Donut chart
  const scopeData = useMemo(() => {
    const scopes = { 'Scope 1 (Direct)': 0, 'Scope 2 (Indirect)': 0, 'Scope 3 (Other)': 0 };
    transactions.forEach((t) => {
      if (t.scope === 'SCOPE1') scopes['Scope 1 (Direct)'] += Number(t.co2Kg);
      else if (t.scope === 'SCOPE2') scopes['Scope 2 (Indirect)'] += Number(t.co2Kg);
      else if (t.scope === 'SCOPE3') scopes['Scope 3 (Other)'] += Number(t.co2Kg);
    });
    return Object.entries(scopes).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(1)),
    }));
  }, [transactions]);

  const COLORS = ['#22c55e', '#3b82f6', '#a855f7'];

  // Handle forms
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId || !factorId || !quantity) {
      toast.error('Please fill in all required fields.');
      return;
    }
    await logTransaction({
      departmentId: deptId,
      emissionFactorId: factorId,
      quantity: parseFloat(quantity),
      sourceType,
      date,
      notes,
    });
    setShowLogForm(false);
    setFactorId('');
    setQuantity('');
    setNotes('');
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle || !goalDeptId || !targetCo2 || !deadline) {
      toast.error('All fields are required.');
      return;
    }
    await createGoal({
      title: goalTitle,
      departmentId: goalDeptId,
      targetCo2: parseFloat(targetCo2),
      deadline,
    });
    setShowGoalForm(false);
    setGoalTitle('');
    setTargetCo2('');
    setDeadline('');
  };

  const handleProgressIncrement = async (goalId: string, current: number) => {
    const val = parseFloat(incrementVal);
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid positive number');
      return;
    }
    await updateGoalProgress(goalId, current + val);
    setUpdatingGoalId(null);
    setIncrementVal('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Environmental Module
          </h1>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Greenhouse gas emissions tracking, Scope 1/2/3 breakdown, and target checklist.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowLogForm(!showLogForm)} className="btn btn-primary">
            <Plus size={16} /> Log Carbon
          </button>
          {user?.role !== 'EMPLOYEE' && (
            <button onClick={() => setShowGoalForm(!showGoalForm)} className="btn btn-secondary">
              <Plus size={16} /> New Goal
            </button>
          )}
        </div>
      </div>

      {/* Log Transaction Modal Form */}
      {showLogForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--env)' }}>
          <h3 style={{ marginBottom: '1.25rem' }}>Log Carbon Transaction</h3>
          <form onSubmit={handleLogSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {user?.role !== 'EMPLOYEE' ? (
              <div>
                <label className="label">Department</label>
                <select className="input" value={deptId} onChange={(e) => setDeptId(e.target.value)} required>
                  <option value="">Select Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            ) : null}

            <div>
              <label className="label">Emission Factor</label>
              <select className="input" value={factorId} onChange={(e) => setFactorId(e.target.value)} required>
                <option value="">Select Factor Source</option>
                {emissionFactors.filter((ef) => ef.status === 'ACTIVE').map((ef) => (
                  <option key={ef.id} value={ef.id}>{ef.name} ({ef.unit})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Quantity</label>
              <input type="number" step="any" className="input" placeholder="e.g. 1500" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>

            <div>
              <label className="label">Source Type</label>
              <input type="text" className="input" placeholder="e.g. Fleet, Electricity" value={sourceType} onChange={(e) => setSourceType(e.target.value)} required />
            </div>

            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div>
              <label className="label">Notes / Reference</label>
              <input type="text" className="input" placeholder="Fuel logs invoice #192" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowLogForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Transaction</button>
            </div>
          </form>
        </div>
      )}

      {/* Goal creation Form */}
      {showGoalForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--gamify)' }}>
          <h3 style={{ marginBottom: '1.25rem' }}>Create Environmental Goal</h3>
          <form onSubmit={handleGoalSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="label">Goal Title</label>
              <input type="text" className="input" placeholder="e.g. Reduce Fleet Diesel CO2" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} required />
            </div>

            <div>
              <label className="label">Department</label>
              <select className="input" value={goalDeptId} onChange={(e) => setGoalDeptId(e.target.value)} required>
                <option value="">Select Department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Target CO₂ reduction (Kg)</label>
              <input type="number" step="any" className="input" placeholder="e.g. 5000" value={targetCo2} onChange={(e) => setTargetCo2(e.target.value)} required />
            </div>

            <div>
              <label className="label">Deadline</label>
              <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowGoalForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Create Goal</button>
            </div>
          </form>
        </div>
      )}

      {/* Donut and Goal Section Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* Scope Donut Chart */}
        <div className="card" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: '1rem' }}>Scope Breakdown</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            {transactions.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                No emissions logged to chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scopeData}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {scopeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} kg CO₂e`} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Environmental Goals Checklist */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600' }}>Active Environmental Goals</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', maxHeight: '280px' }}>
            {goals.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
                No goals active for this department.
              </div>
            ) : (
              goals.map((goal) => {
                const target = Number(goal.targetCo2);
                const current = Number(goal.currentCo2);
                const pct = Math.min(100, Math.round((current / target) * 100));
                
                return (
                  <div key={goal.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>{goal.title}</span>
                      <span className={`badge ${goal.status === 'COMPLETED' ? 'badge--active' : goal.status === 'AT_RISK' ? 'badge--high' : 'badge--pending'}`}>
                        {goal.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>Progress: {current} / {target} kg CO₂</span>
                      <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                    </div>

                    <div className="progress-bar">
                      <div className="progress-bar__fill" style={{ width: `${pct}%`, backgroundColor: goal.status === 'COMPLETED' ? 'var(--env)' : goal.status === 'AT_RISK' ? 'var(--severity-high)' : 'var(--social)' }} />
                    </div>

                    {/* Progress Update triggers */}
                    {updatingGoalId === goal.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          className="input"
                          placeholder="Add CO2 saved (kg)"
                          style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--text-xs)' }}
                          value={incrementVal}
                          onChange={(e) => setIncrementVal(e.target.value)}
                        />
                        <button onClick={() => handleProgressIncrement(goal.id, current)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '10px' }}>Apply</button>
                        <button onClick={() => setUpdatingGoalId(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '10px' }}>Cancel</button>
                      </div>
                    ) : (
                      goal.status !== 'COMPLETED' && (
                        <button onClick={() => setUpdatingGoalId(goal.id)} className="btn btn-secondary" style={{ alignSelf: 'flex-start', padding: '0.2rem 0.5rem', fontSize: '10px', marginTop: '0.25rem' }}>
                          Update Progress
                        </button>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Transactions List Table */}
      <div className="card">
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: '1.25rem' }}>Logged Carbon Entries</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Department</th>
                <th>Scope</th>
                <th>Source Type</th>
                <th>Quantity</th>
                <th>CO₂ Equivalent</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No carbon transactions logged yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.date).toLocaleDateString()}</td>
                    <td>{tx.department.name}</td>
                    <td>
                      <span className={`badge ${tx.scope === 'SCOPE1' ? 'badge--active' : tx.scope === 'SCOPE2' ? 'badge--pending' : 'badge--draft'}`}>
                        {tx.scope}
                      </span>
                    </td>
                    <td>{tx.sourceType}</td>
                    <td>{tx.quantity} {tx.emissionFactor.unit}</td>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{tx.co2Kg} kg</td>
                    <td>{tx.createdBy?.name || 'Automated Sync'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentalPage;
