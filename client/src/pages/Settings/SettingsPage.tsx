import React, { useEffect, useState } from 'react';
import { useEsgStore } from '../../store/esgStore';
import api from '../../lib/api';
import { Settings as SettingsIcon, Save, Plus, ShieldCheck, Scale } from 'lucide-react';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const { 
    departments, categories, esgSettings,
    fetchSettingsData, updateEsgConfig 
  } = useEsgStore();

  useEffect(() => {
    fetchSettingsData();
  }, [fetchSettingsData]);

  // Settings State
  const [envWeight, setEnvWeight] = useState(40);
  const [socialWeight, setSocialWeight] = useState(30);
  const [govWeight, setGovWeight] = useState(30);
  const [autoBadge, setAutoBadge] = useState(true);
  const [evidenceRequired, setEvidenceRequired] = useState(true);
  const [autoEmission, setAutoEmission] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(false);

  // Sync settings when loaded
  useEffect(() => {
    if (esgSettings) {
      setEnvWeight(esgSettings.envWeight);
      setSocialWeight(esgSettings.socialWeight);
      setGovWeight(esgSettings.govWeight);
      setAutoBadge(esgSettings.autoBadgeAward);
      setEvidenceRequired(esgSettings.evidenceRequired);
      setAutoEmission(esgSettings.autoEmissionCalc);
      setEmailAlerts(esgSettings.emailAlerts);
    }
  }, [esgSettings]);

  // Dept creation state
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptParentId, setDeptParentId] = useState('');

  // Category creation state
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'CSR_ACTIVITY' | 'CHALLENGE'>('CSR_ACTIVITY');

  const weightSum = envWeight + socialWeight + govWeight;
  const isWeightValid = weightSum === 100;

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWeightValid) {
      toast.error('Global weights must sum to exactly 100%');
      return;
    }
    await updateEsgConfig({
      envWeight,
      socialWeight,
      govWeight,
      autoBadgeAward: autoBadge,
      evidenceRequired,
      autoEmissionCalc: autoEmission,
      emailAlerts,
    });
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName || !deptCode) {
      toast.error('Department name and code are required.');
      return;
    }
    await api.post('/settings/departments', {
      name: deptName,
      code: deptCode.toUpperCase(),
      parentId: deptParentId || null,
    });
    toast.success('Department added successfully!');
    setDeptName('');
    setDeptCode('');
    setDeptParentId('');
    fetchSettingsData();
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) {
      toast.error('Category name is required.');
      return;
    }
    await api.post('/settings/categories', {
      name: catName,
      type: catType,
    });
    toast.success('Category added successfully!');
    setCatName('');
    fetchSettingsData();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Platform Settings
        </h1>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Configure global ESG parameters, department directories, and custom categories.
        </span>
      </div>

      {/* ESG Parameters Card */}
      <div className="card" style={{ borderLeft: '4px solid var(--gov)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingsIcon size={18} color="var(--gov)" /> Global ESG Configurations
        </h3>

        <form onSubmit={handleSettingsSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Weights adjustment */}
          <div>
            <span className="label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span>Department Weight Matrix</span>
              <span style={{ color: isWeightValid ? 'var(--env)' : 'var(--severity-high)', fontWeight: 'bold' }}>
                Sum: {weightSum}% {isWeightValid ? '(Valid)' : '(Must equal 100%)'}
              </span>
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label className="label" htmlFor="env-weight">Environmental Weight: {envWeight}%</label>
                <input 
                  id="env-weight"
                  type="range" 
                  min="0" 
                  max="100" 
                  className="input" 
                  style={{ padding: 0 }} 
                  value={envWeight} 
                  onChange={(e) => setEnvWeight(parseInt(e.target.value))} 
                />
              </div>

              <div>
                <label className="label" htmlFor="social-weight">Social Weight: {socialWeight}%</label>
                <input 
                  id="social-weight"
                  type="range" 
                  min="0" 
                  max="100" 
                  className="input" 
                  style={{ padding: 0 }} 
                  value={socialWeight} 
                  onChange={(e) => setSocialWeight(parseInt(e.target.value))} 
                />
              </div>

              <div>
                <label className="label" htmlFor="gov-weight">Governance Weight: {govWeight}%</label>
                <input 
                  id="gov-weight"
                  type="range" 
                  min="0" 
                  max="100" 
                  className="input" 
                  style={{ padding: 0 }} 
                  value={govWeight} 
                  onChange={(e) => setGovWeight(parseInt(e.target.value))} 
                />
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderBottom: '1px solid var(--border)' }} />

          {/* Toggle Switches */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input type="checkbox" id="autoBadge" checked={autoBadge} onChange={(e) => setAutoBadge(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <div>
                <label htmlFor="autoBadge" style={{ fontSize: 'var(--text-sm)', fontWeight: '600', cursor: 'pointer' }}>Auto Badge Awarding</label>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Auto award badges on qualifying metrics</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input type="checkbox" id="evidenceRequired" checked={evidenceRequired} onChange={(e) => setEvidenceRequired(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <div>
                <label htmlFor="evidenceRequired" style={{ fontSize: 'var(--text-sm)', fontWeight: '600', cursor: 'pointer' }}>Evidence Verification Required</label>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Require uploading proof files for CSR drives</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.6 }}>
              <input type="checkbox" id="autoEmission" checked={autoEmission} onChange={(e) => setAutoEmission(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <div>
                <label htmlFor="autoEmission" style={{ fontSize: 'var(--text-sm)', fontWeight: '600', cursor: 'pointer' }}>Auto Emission Calc (Stub)</label>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Sync calculations from active ERP modules</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.6 }}>
              <input type="checkbox" id="emailAlerts" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <div>
                <label htmlFor="emailAlerts" style={{ fontSize: 'var(--text-sm)', fontWeight: '600', cursor: 'pointer' }}>Email Alert Reminders (Stub)</label>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Dispatch notifications for pending compliance</span>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ alignSelf: 'flex-end', gap: '6px', fontWeight: 'bold' }}
            disabled={!isWeightValid}
          >
            <Save size={16} /> Save ESG Parameters
          </button>
        </form>
      </div>

      {/* Grid for CRUD forms: Departments & Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem' }}>
        
        {/* Department CRUD */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Scale size={18} color="var(--env)" /> Department Management
          </h3>

          <form onSubmit={handleDeptSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div>
              <input type="text" className="input" placeholder="Department Name" value={deptName} onChange={(e) => setDeptName(e.target.value)} required />
            </div>
            <div>
              <input type="text" className="input" placeholder="Code (e.g. MFG)" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} required />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem' }}>
              <select className="input" value={deptParentId} onChange={(e) => setDeptParentId(e.target.value)} style={{ flex: 1 }}>
                <option value="">No Parent (Root Department)</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.625rem 1rem' }}>
                <Plus size={16} /> Add
              </button>
            </div>
          </form>

          <div style={{ overflowY: 'auto', maxHeight: '200px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Employees</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id}>
                    <td style={{ fontWeight: 'bold' }}>{dept.code}</td>
                    <td>{dept.name}</td>
                    <td>{dept.employeeCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category CRUD */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={18} color="var(--social)" /> Category Management
          </h3>

          <form onSubmit={handleCatSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div>
              <input type="text" className="input" placeholder="Category Name" value={catName} onChange={(e) => setCatName(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select className="input" value={catType} onChange={(e: any) => setCatType(e.target.value)} required style={{ flex: 1 }}>
                <option value="CSR_ACTIVITY">CSR Activity</option>
                <option value="CHALLENGE">Challenge</option>
              </select>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.625rem 1rem' }}>
                <Plus size={16} /> Add
              </button>
            </div>
          </form>

          <div style={{ overflowY: 'auto', maxHeight: '200px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Assigned Module Type</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>{cat.name}</td>
                    <td>
                      <span className={`badge ${cat.type === 'CHALLENGE' ? 'badge--pending' : 'badge--active'}`}>
                        {cat.type.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
