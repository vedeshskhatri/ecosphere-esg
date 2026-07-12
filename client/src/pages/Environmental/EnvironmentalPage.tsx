import { useLocation, useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEsgStore } from '../../store/esgStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Plus, BarChart3, TrendingDown, Target } from 'lucide-react';
import toast from 'react-hot-toast';

export const EnvironmentalPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    emissionFactors, transactions, goals, departments,
    fetchEnvironmentalData, logTransaction, createGoal, updateGoalProgress 
  } = useEsgStore();

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchEnvironmentalData();
  }, [fetchEnvironmentalData]);

  // Tabs: Emission Factors / Carbon Log / Reduction Goals
  type TabType = 'factors' | 'transactions' | 'goals';
  
  const getTabFromPath = (): TabType => {
    const path = location.pathname;
    if (path.includes('/transactions')) return 'transactions';
    if (path.includes('/goals')) return 'goals';
    return 'factors';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromPath());

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'factors') navigate('/environmental/factors');
    else if (tab === 'transactions') navigate('/environmental/transactions');
    else if (tab === 'goals') navigate('/environmental/goals');
  };

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
      {/* Page Title & Tab Menu */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: '700', letterSpacing: '-0.025em', margin: 0, color: '#19350C' }}>
            Environmental Module
          </h1>
          <span style={{ fontSize: 'var(--text-sm)', color: '#687D31', marginTop: '2px', display: 'inline-block' }}>
            Greenhouse gas emissions tracking, Scope 1/2/3 breakdown, and target checklist.
          </span>
        </div>
        
        {/* Module Sub-tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', background: '#EEECEA', padding: '3px', borderRadius: '9px', border: '1px solid rgba(25,53,12,0.12)' }}>
          <button
            onClick={() => handleTabChange('factors')}
            className="btn"
            style={{
              padding: '0.35rem 0.875rem',
              border: 'none',
              borderRadius: '7px',
              backgroundColor: activeTab === 'factors' ? '#ffffff' : 'transparent',
              color: activeTab === 'factors' ? '#19350C' : '#3D4A28',
              fontWeight: activeTab === 'factors' ? 600 : 500,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <BarChart3 size={14} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} />
            Emission Factors
          </button>
          <button
            onClick={() => handleTabChange('transactions')}
            className="btn"
            style={{
              padding: '0.35rem 0.875rem',
              border: 'none',
              borderRadius: '7px',
              backgroundColor: activeTab === 'transactions' ? '#ffffff' : 'transparent',
              color: activeTab === 'transactions' ? '#19350C' : '#3D4A28',
              fontWeight: activeTab === 'transactions' ? 600 : 500,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <TrendingDown size={14} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} />
            Carbon Log
          </button>
          <button
            onClick={() => handleTabChange('goals')}
            className="btn"
            style={{
              padding: '0.35rem 0.875rem',
              border: 'none',
              borderRadius: '7px',
              backgroundColor: activeTab === 'goals' ? '#ffffff' : 'transparent',
              color: activeTab === 'goals' ? '#19350C' : '#3D4A28',
              fontWeight: activeTab === 'goals' ? 600 : 500,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Target size={14} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} />
            Reduction Goals
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          EMISSION FACTORS TAB
          ───────────────────────────────────────── */}
      {activeTab === 'factors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', color: '#19350C' }}>Emission Coefficient Library</h2>
              <p style={{ fontSize: 'var(--text-xs)', color: '#687D31' }}>
                Standardized Scope 1, 2, and 3 multipliers used to compute carbon equivalents.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: 0, borderRadius: '12px', border: '1px solid rgba(25,53,12,0.10)', overflow: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(25,53,12,0.02)' }}>
                  <th style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(25,53,12,0.10)', color: '#687D31', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Factor Name</th>
                  <th style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(25,53,12,0.10)', color: '#687D31', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Source Type</th>
                  <th style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(25,53,12,0.10)', color: '#687D31', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Scope</th>
                  <th style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(25,53,12,0.10)', color: '#687D31', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Factor Value</th>
                  <th style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(25,53,12,0.10)', color: '#687D31', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Unit</th>
                </tr>
              </thead>
              <tbody>
                {emissionFactors.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#687D31' }}>
                      No emission factors loaded.
                    </td>
                  </tr>
                ) : (
                  emissionFactors.map((ef) => (
                    <tr key={ef.id} style={{ borderBottom: '1px solid rgba(25,53,12,0.06)' }}>
                      <td style={{ padding: '1rem', fontWeight: 600, color: '#19350C' }}>{ef.name}</td>
                      <td style={{ padding: '1rem', color: '#3D4A28' }}>{ef.sourceType}</td>
                      <td style={{ padding: '1rem' }}>
                        <span className={`badge ${ef.scope === 'SCOPE1' ? 'badge--active' : ef.scope === 'SCOPE2' ? 'badge--pending' : 'badge--draft'}`}>
                          {ef.scope}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#19350C' }}>{parseFloat(ef.factorValue).toFixed(4)}</td>
                      <td style={{ padding: '1rem', color: '#687D31', fontSize: '13px' }}>{ef.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          CARBON LOG TAB
          ───────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Actions Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', color: '#19350C' }}>Emissions Ledger</h2>
              <p style={{ fontSize: 'var(--text-xs)', color: '#687D31' }}>
                Track and log Scope 1/2/3 activities with auto-calculated carbon equivalents.
              </p>
            </div>
            <button
              onClick={() => setShowLogForm(!showLogForm)}
              className="btn btn-primary"
              style={{
                backgroundColor: '#687D31',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Log Carbon
            </button>
          </div>

          {/* Log Transaction Form */}
          {showLogForm && (
            <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(25,53,12,0.14)', background: '#ffffff' }}>
              <h3 style={{ marginBottom: '1.25rem', color: '#19350C', fontWeight: 600 }}>Log Carbon Transaction</h3>
              <form onSubmit={handleLogSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {user?.role !== 'EMPLOYEE' ? (
                  <div>
                    <label className="label" style={{ color: '#3D4A28', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department</label>
                    <select className="form-input" value={deptId} onChange={(e) => setDeptId(e.target.value)} required style={{ height: '38px', borderRadius: '6px' }}>
                      <option value="">Select Department</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                ) : null}

                <div>
                  <label className="label" style={{ color: '#3D4A28', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Emission Factor</label>
                  <select className="form-input" value={factorId} onChange={(e) => setFactorId(e.target.value)} required style={{ height: '38px', borderRadius: '6px' }}>
                    <option value="">Select Factor Source</option>
                    {emissionFactors.filter((ef) => ef.status === 'ACTIVE').map((ef) => (
                      <option key={ef.id} value={ef.id}>{ef.name} ({ef.unit})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" style={{ color: '#3D4A28', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Quantity</label>
                  <input type="number" step="any" className="form-input" placeholder="e.g. 1500" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ height: '38px', borderRadius: '6px' }} />
                </div>

                <div>
                  <label className="label" style={{ color: '#3D4A28', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Source Type</label>
                  <input type="text" className="form-input" placeholder="e.g. Fleet, Electricity" value={sourceType} onChange={(e) => setSourceType(e.target.value)} required style={{ height: '38px', borderRadius: '6px' }} />
                </div>

                <div>
                  <label className="label" style={{ color: '#3D4A28', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Date</label>
                  <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} required style={{ height: '38px', borderRadius: '6px' }} />
                </div>

                <div>
                  <label className="label" style={{ color: '#3D4A28', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Notes / Reference</label>
                  <input type="text" className="form-input" placeholder="Fuel logs invoice #192" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ height: '38px', borderRadius: '6px' }} />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowLogForm(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: 'rgba(25,53,12,0.06)', border: '1px solid rgba(25,53,12,0.12)', color: '#3D4A28' }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', background: '#687D31', color: '#fff', border: 'none' }}>Save Transaction</button>
                </div>
              </form>
            </div>
          )}

          {/* Chart & Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ height: '320px', display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '12px', border: '1px solid rgba(25,53,12,0.10)', padding: '1.25rem' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '600', color: '#19350C', marginBottom: '1rem' }}>Scope Breakdown (CO₂e)</h3>
              <div style={{ flex: 1, minHeight: 0 }}>
                {transactions.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#687D31' }}>
                    No emissions logged to chart.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scopeData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={75}
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

            {/* Quick Stats Summary */}
            <div className="card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid rgba(25,53,12,0.10)', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '320px' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '600', color: '#19350C', marginBottom: '1rem' }}>ESG Overview</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
                <div style={{ background: 'rgba(104,125,49,0.06)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(104,125,49,0.14)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#687D31', fontWeight: 600 }}>Total CO₂ Tracked</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#19350C', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {transactions.reduce((acc, tx) => acc + Number(tx.co2Kg), 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span style={{ fontSize: '14px', fontWeight: 500 }}>kg</span>
                  </div>
                </div>
                <div style={{ background: 'rgba(64,103,104,0.06)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(64,103,104,0.14)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#406768', fontWeight: 600 }}>Logged Entries Count</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#19350C', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {transactions.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions List Table */}
          <div className="card" style={{ padding: 0, borderRadius: '12px', border: '1px solid rgba(25,53,12,0.10)', overflow: 'hidden', background: '#ffffff' }}>
            <div style={{ padding: '1.125rem 1.25rem', borderBottom: '1px solid rgba(25,53,12,0.10)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: '#19350C', margin: 0 }}>Logged Carbon Entries</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(25,53,12,0.02)' }}>
                    <th style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(25,53,12,0.10)', color: '#687D31', fontSize: '11px', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(25,53,12,0.10)', color: '#687D31', fontSize: '11px', textTransform: 'uppercase' }}>Department</th>
                    <th style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(25,53,12,0.10)', color: '#687D31', fontSize: '11px', textTransform: 'uppercase' }}>Scope</th>
                    <th style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(25,53,12,0.10)', color: '#687D31', fontSize: '11px', textTransform: 'uppercase' }}>Source Type</th>
                    <th style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(25,53,12,0.10)', color: '#687D31', fontSize: '11px', textTransform: 'uppercase' }}>Quantity</th>
                    <th style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(25,53,12,0.10)', color: '#687D31', fontSize: '11px', textTransform: 'uppercase' }}>CO₂ Equivalent</th>
                    <th style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(25,53,12,0.10)', color: '#687D31', fontSize: '11px', textTransform: 'uppercase' }}>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#687D31' }}>
                        No carbon transactions logged yet.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid rgba(25,53,12,0.06)' }}>
                        <td style={{ padding: '1rem', color: '#3D4A28' }}>{new Date(tx.date).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem', color: '#19350C', fontWeight: 600 }}>{tx.department.name}</td>
                        <td style={{ padding: '1rem' }}>
                          <span className={`badge ${tx.scope === 'SCOPE1' ? 'badge--active' : tx.scope === 'SCOPE2' ? 'badge--pending' : 'badge--draft'}`}>
                            {tx.scope}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: '#3D4A28' }}>{tx.sourceType}</td>
                        <td style={{ padding: '1rem', color: '#687D31' }}>{tx.quantity} {tx.emissionFactor.unit}</td>
                        <td style={{ padding: '1rem', fontWeight: '600', color: '#19350C', fontFamily: 'var(--font-mono)' }}>{tx.co2Kg} kg</td>
                        <td style={{ padding: '1rem', color: '#687D31' }}>{tx.createdBy?.name || 'Automated Sync'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          REDUCTION GOALS TAB
          ───────────────────────────────────────── */}
      {activeTab === 'goals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Actions Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', color: '#19350C' }}>Reduction Checklist</h2>
              <p style={{ fontSize: 'var(--text-xs)', color: '#687D31' }}>
                Establish and track carbon reduction targets to enforce corporate accountability.
              </p>
            </div>
            {user?.role !== 'EMPLOYEE' && (
              <button
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="btn btn-secondary"
                style={{
                  backgroundColor: '#687D31',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} /> New Goal
              </button>
            )}
          </div>

          {/* Goal creation Form */}
          {showGoalForm && (
            <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(25,53,12,0.14)', background: '#ffffff' }}>
              <h3 style={{ marginBottom: '1.25rem', color: '#19350C', fontWeight: 600 }}>Create Environmental Goal</h3>
              <form onSubmit={handleGoalSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="label" style={{ color: '#3D4A28', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Goal Title</label>
                  <input type="text" className="form-input" placeholder="e.g. Reduce Fleet Diesel CO2" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} required style={{ height: '38px', borderRadius: '6px' }} />
                </div>

                <div>
                  <label className="label" style={{ color: '#3D4A28', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department</label>
                  <select className="form-input" value={goalDeptId} onChange={(e) => setGoalDeptId(e.target.value)} required style={{ height: '38px', borderRadius: '6px' }}>
                    <option value="">Select Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label" style={{ color: '#3D4A28', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Target CO₂ reduction (Kg)</label>
                  <input type="number" step="any" className="form-input" placeholder="e.g. 5000" value={targetCo2} onChange={(e) => setTargetCo2(e.target.value)} required style={{ height: '38px', borderRadius: '6px' }} />
                </div>

                <div>
                  <label className="label" style={{ color: '#3D4A28', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Deadline</label>
                  <input type="date" className="form-input" value={deadline} onChange={(e) => setDeadline(e.target.value)} required style={{ height: '38px', borderRadius: '6px' }} />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowGoalForm(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: 'rgba(25,53,12,0.06)', border: '1px solid rgba(25,53,12,0.12)', color: '#3D4A28' }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', background: '#687D31', color: '#fff', border: 'none' }}>Create Goal</button>
                </div>
              </form>
            </div>
          )}

          {/* Goals Checklist Card */}
          <div className="card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid rgba(25,53,12,0.10)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '600', color: '#19350C', marginBottom: '1.25rem' }}>Active Environmental Goals</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {goals.length === 0 ? (
                <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#687D31', border: '1px dashed rgba(25,53,12,0.15)', borderRadius: '8px' }}>
                  No goals active at this moment.
                </div>
              ) : (
                goals.map((goal) => {
                  const target = Number(goal.targetCo2);
                  const current = Number(goal.currentCo2);
                  const pct = Math.min(100, Math.round((current / target) * 100));
                  
                  return (
                    <div key={goal.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(25,53,12,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: '#19350C' }}>{goal.title}</span>
                        <span className={`badge ${goal.status === 'COMPLETED' ? 'badge--active' : goal.status === 'AT_RISK' ? 'badge--high' : 'badge--pending'}`}>
                          {goal.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#687D31' }}>
                        <span>Progress: {current} / {target} kg CO₂</span>
                        <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                      </div>

                      <div className="progress-bar" style={{ height: '6px', background: '#EEECEA', borderRadius: '999px', overflow: 'hidden' }}>
                        <div className="progress-bar__fill" style={{ height: '100%', width: `${pct}%`, backgroundColor: goal.status === 'COMPLETED' ? '#687D31' : goal.status === 'AT_RISK' ? 'var(--severity-high)' : '#406768', borderRadius: '999px' }} />
                      </div>

                      {/* Progress Update triggers */}
                      {updatingGoalId === goal.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                          <input
                            type="number"
                            className="form-input"
                            placeholder="Add CO2 saved (kg)"
                            style={{ padding: '0.35rem 0.5rem', fontSize: 'var(--text-xs)', width: '180px', borderRadius: '6px', border: '1px solid rgba(25,53,12,0.18)' }}
                            value={incrementVal}
                            onChange={(e) => setIncrementVal(e.target.value)}
                          />
                          <button onClick={() => handleProgressIncrement(goal.id, current)} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '11px', background: '#687D31', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Apply</button>
                          <button onClick={() => setUpdatingGoalId(null)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '11px', background: 'rgba(25,53,12,0.06)', color: '#3D4A28', border: '1px solid rgba(25,53,12,0.12)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      ) : (
                        goal.status !== 'COMPLETED' && (
                          <button
                            onClick={() => setUpdatingGoalId(goal.id)}
                            className="btn btn-secondary"
                            style={{
                              alignSelf: 'flex-start',
                              padding: '0.3rem 0.625rem',
                              fontSize: '11px',
                              marginTop: '0.25rem',
                              background: 'rgba(25,53,12,0.06)',
                              border: '1px solid rgba(25,53,12,0.12)',
                              color: '#3D4A28',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
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
      )}
    </div>
  );
};

export default EnvironmentalPage;
