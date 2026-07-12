import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { Building2, Tag, Settings, Bell, Plus, Edit, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface Department {
  id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE';
  employeeCount: number;
  head?: { name: string } | null;
  parent?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
  type: 'CSR_ACTIVITY' | 'CHALLENGE';
  status: 'ACTIVE' | 'INACTIVE';
}

interface EsgConfig {
  envWeight: number;
  socialWeight: number;
  govWeight: number;
  autoBadgeAward: boolean;
  evidenceRequired: boolean;
  autoEmissionCalc: boolean;
  emailAlerts: boolean;
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  // Tabs state
  const [activeTab, setActiveTab] = useState<'departments' | 'categories' | 'esg' | 'notifications'>('departments');

  // Loading state
  const [loading, setLoading] = useState(true);

  // Entities state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Sliders state
  const [envWeight, setEnvWeight] = useState(40);
  const [socialWeight, setSocialWeight] = useState(30);
  const [govWeight, setGovWeight] = useState(30);

  // Toggles state
  const [autoBadge, setAutoBadge] = useState(true);
  const [evidenceRequired, setEvidenceRequired] = useState(true);
  const [autoEmission, setAutoEmission] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(false);

  // Static notifications state (UI-only)
  const [notifications, setNotifications] = useState({
    badgeUnlocked: true,
    csrApproved: true,
    csrRejected: true,
    challengeApproved: true,
    challengeRejected: true,
    complianceOverdue: true,
    policyReminder: false,
    rewardRedeemed: true,
  });

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptModalMode, setDeptModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({
    name: '',
    type: 'CSR_ACTIVITY' as 'CSR_ACTIVITY' | 'CHALLENGE',
  });

  // Fetch functions
  const fetchDepartments = async () => {
    try {
      const res = await api.get('/settings/departments');
      if (res.data?.success) {
        setDepartments(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching departments:', err);
      toast.error('Failed to fetch departments');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/settings/categories');
      if (res.data?.success) {
        setCategories(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      toast.error('Failed to fetch categories');
    }
  };

  const fetchEsgConfig = async () => {
    try {
      const res = await api.get('/settings/esg-config');
      if (res.data?.success) {
        const config: EsgConfig = res.data.data;
        setEnvWeight(config.envWeight);
        setSocialWeight(config.socialWeight);
        setGovWeight(config.govWeight);
        setAutoBadge(config.autoBadgeAward);
        setEvidenceRequired(config.evidenceRequired);
        setAutoEmission(config.autoEmissionCalc);
        setEmailAlerts(config.emailAlerts);
      }
    } catch (err: any) {
      console.error('Error fetching ESG config:', err);
      toast.error('Failed to fetch ESG configuration');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDepartments(), fetchCategories(), fetchEsgConfig()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Slider Math
  const weightSum = envWeight + socialWeight + govWeight;
  const isWeightValid = weightSum === 100;

  // Department CRUD Handlers
  const handleOpenCreateDept = () => {
    if (!isAdmin) return;
    setDeptForm({
      name: '',
      code: '',
      status: 'ACTIVE',
    });
    setDeptModalMode('create');
    setSelectedDeptId(null);
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: Department) => {
    if (!isAdmin) return;
    setDeptForm({
      name: dept.name,
      code: dept.code,
      status: dept.status,
    });
    setDeptModalMode('edit');
    setSelectedDeptId(dept.id);
    setIsDeptModalOpen(true);
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!deptForm.name.trim() || !deptForm.code.trim()) {
      toast.error('Name and Code are required.');
      return;
    }
    try {
      if (deptModalMode === 'create') {
        const res = await api.post('/settings/departments', {
          name: deptForm.name.trim(),
          code: deptForm.code.trim().toUpperCase(),
        });
        if (res.data?.success) {
          toast.success('Department added successfully!');
          setIsDeptModalOpen(false);
          fetchDepartments();
        } else {
          toast.error(res.data?.error || 'Failed to create department.');
        }
      } else {
        const res = await api.patch(`/settings/departments/${selectedDeptId}`, {
          name: deptForm.name.trim(),
          code: deptForm.code.trim().toUpperCase(),
          status: deptForm.status,
        });
        if (res.data?.success) {
          toast.success('Department updated successfully!');
          setIsDeptModalOpen(false);
          fetchDepartments();
        } else {
          toast.error(res.data?.error || 'Failed to update department.');
        }
      }
    } catch (err: any) {
      console.error('Error saving department:', err);
      toast.error(err.response?.data?.error || 'Failed to save department.');
    }
  };

  const handleDeptDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to deactivate this department?')) {
      return;
    }
    try {
      const res = await api.delete(`/settings/departments/${id}`);
      if (res.data?.success) {
        toast.success('Department deactivated.');
        fetchDepartments();
      } else {
        toast.error(res.data?.error || 'Failed to deactivate department.');
      }
    } catch (err: any) {
      console.error('Error deleting department:', err);
      toast.error(err.response?.data?.error || 'Failed to deactivate department.');
    }
  };

  // Category CRUD Handlers
  const handleOpenCreateCat = () => {
    if (!isAdmin) return;
    setCatForm({
      name: '',
      type: 'CSR_ACTIVITY',
    });
    setIsCatModalOpen(true);
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!catForm.name.trim()) {
      toast.error('Category name is required.');
      return;
    }
    try {
      const res = await api.post('/settings/categories', {
        name: catForm.name.trim(),
        type: catForm.type,
      });
      if (res.data?.success) {
        toast.success('Category added successfully!');
        setIsCatModalOpen(false);
        fetchCategories();
      } else {
        toast.error(res.data?.error || 'Failed to create category.');
      }
    } catch (err: any) {
      console.error('Error creating category:', err);
      toast.error(err.response?.data?.error || 'Failed to create category.');
    }
  };

  // ESG Configuration Handler
  const handleEsgSave = async () => {
    if (!isAdmin) return;
    if (!isWeightValid) {
      toast.error('Weights must total exactly 100%');
      return;
    }
    try {
      const res = await api.patch('/settings/esg-config', {
        envWeight,
        socialWeight,
        govWeight,
        autoBadgeAward: autoBadge,
        evidenceRequired,
        autoEmissionCalc: autoEmission,
        emailAlerts: emailAlerts,
      });
      if (res.data?.success) {
        toast.success('Configuration saved.');
        fetchEsgConfig();
      } else {
        toast.error(res.data?.error || 'Failed to save ESG configuration.');
      }
    } catch (err: any) {
      console.error('Error saving ESG config:', err);
      toast.error(err.response?.data?.error || 'Failed to save ESG configuration.');
    }
  };

  // UI Notification Toggle Handler
  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <span style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)' }}>Loading Settings...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minHeight: '100%' }}>
      {/* CSS custom overrides for ranges, iOS toggles, and modals */}
      <style>{`
        .ios-toggle-label {
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }
        .ios-toggle-switch {
          position: relative;
          width: 44px;
          height: 24px;
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          transition: background-color 0.2s, border-color 0.2s;
        }
        .ios-toggle-switch::after {
          content: "";
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background-color: #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s;
        }
        .ios-toggle-checkbox {
          display: none;
        }
        .ios-toggle-checkbox:checked + .ios-toggle-switch {
          background-color: #3b82f6;
          border-color: #3b82f6;
        }
        .ios-toggle-checkbox:checked + .ios-toggle-switch::after {
          transform: translateX(20px);
        }
        .ios-toggle-checkbox:disabled + .ios-toggle-switch {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .esg-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          outline: none;
          margin: 10px 0;
        }
        .esg-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .esg-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .esg-slider-env::-webkit-slider-thumb {
          background: #22c55e;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
        }
        .esg-slider-social::-webkit-slider-thumb {
          background: #3b82f6;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
        .esg-slider-gov::-webkit-slider-thumb {
          background: #a855f7;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-content {
          background: rgba(22, 26, 35, 0.9);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-lg);
          padding: 2rem;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          animation: slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .glass-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          font-family: var(--font-body);
          font-size: var(--text-sm);
          font-weight: 500;
          color: #3D4A28;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.18s ease;
          outline: none;
        }
        .glass-tab:hover {
          color: #19350C;
          background: rgba(25, 53, 12, 0.05);
        }
        .glass-tab.active {
          color: #19350C;
          background: #ffffff;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(25, 53, 12, 0.08);
        }
        .dept-code-pill {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.06);
          color: var(--text-secondary);
        }
        .glass-table {
          background: rgba(22, 26, 35, 0.4);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .hover-blue:hover {
          color: #3b82f6 !important;
        }
        .hover-red:hover {
          color: #ef4444 !important;
        }
      `}</style>

      {/* Header section */}
      <div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          System Settings
        </h1>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Manage organization directory, categories, ESG scoring matrices, and alerts.
        </span>
      </div>

      {/* Navigation tabs */}
      <div className="tab-bar" style={{ display: 'flex', gap: '0.25rem', background: '#EEECEA', padding: '3px', borderRadius: '9px', border: '1px solid rgba(25,53,12,0.12)', width: 'fit-content', marginBottom: '1.5rem' }}>
        <button
          id="tab-departments"
          className={`glass-tab ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          <Building2 size={16} />
          Departments
        </button>
        <button
          id="tab-categories"
          className={`glass-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <Tag size={16} />
          Categories
        </button>

        {/* ADMIN only ESG Config tab */}
        {isAdmin && (
          <button
            id="tab-esg"
            className={`glass-tab ${activeTab === 'esg' ? 'active' : ''}`}
            onClick={() => setActiveTab('esg')}
          >
            <Settings size={16} />
            ESG Configuration
          </button>
        )}

        <button
          id="tab-notifications"
          className={`glass-tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={16} />
          Notification Settings
        </button>
      </div>

      {/* Departments Tab Panel */}
      {activeTab === 'departments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: '600' }}>Departments Directory</h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                View and configure your organization's business units.
              </p>
            </div>
            {isAdmin && (
              <button
                id="btn-new-dept"
                className="btn btn-primary"
                onClick={handleOpenCreateDept}
                style={{ background: '#22c55e', color: '#000', gap: '6px' }}
              >
                <Plus size={16} /> New Department
              </button>
            )}
          </div>

          <div className="table-container glass-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Head</th>
                  <th>Parent Dept</th>
                  <th>Status</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No departments found.
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.id}>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{dept.name}</td>
                      <td>
                        <span className="dept-code-pill">{dept.code}</span>
                      </td>
                      <td>{dept.head?.name || <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>—</span>}</td>
                      <td>{dept.parent?.name || <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>—</span>}</td>
                      <td>
                        <span className={`badge ${dept.status === 'ACTIVE' ? 'badge--active' : 'badge--archived'}`} style={{
                          background: dept.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                          color: dept.status === 'ACTIVE' ? '#22c55e' : '#94a3b8'
                        }}>
                          {dept.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleOpenEditDept(dept)}
                              style={{ padding: '4px 8px', color: 'var(--text-muted)' }}
                              title="Edit Department"
                            >
                              <Edit size={14} className="hover-blue" style={{ transition: 'color 0.2s' }} />
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleDeptDelete(dept.id)}
                              style={{ padding: '4px 8px', color: 'var(--text-muted)' }}
                              title="Deactivate Department"
                              disabled={dept.status === 'INACTIVE'}
                            >
                              <Trash2 size={14} className="hover-red" style={{ transition: 'color 0.2s' }} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories Tab Panel */}
      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: '600' }}>Custom Categories</h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Configure thematic groupings for CSR Activities and Gamification Challenges.
              </p>
            </div>
            {isAdmin && (
              <button
                id="btn-new-category"
                className="btn btn-primary"
                onClick={handleOpenCreateCat}
                style={{ background: '#22c55e', color: '#000', gap: '6px' }}
              >
                <Plus size={16} /> New Category
              </button>
            )}
          </div>

          <div className="table-container glass-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id}>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{cat.name}</td>
                      <td>
                        <span className={`badge`} style={{
                          background: cat.type === 'CSR_ACTIVITY' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                          color: cat.type === 'CSR_ACTIVITY' ? '#3b82f6' : '#f97316'
                        }}>
                          {cat.type === 'CSR_ACTIVITY' ? 'CSR ACTIVITY' : 'CHALLENGE'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${cat.status === 'ACTIVE' ? 'badge--active' : 'badge--archived'}`} style={{
                          background: cat.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                          color: cat.status === 'ACTIVE' ? '#22c55e' : '#94a3b8'
                        }}>
                          {cat.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          System Category
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

      {/* ESG Configuration Tab Panel */}
      {activeTab === 'esg' && isAdmin && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: '0.25rem' }}>ESG Configuration</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Adjust organizational score weighting factors and toggle platform behaviors.
            </p>
          </div>

          {/* Section: ESG Score Weights Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '600', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} color="var(--env)" /> ESG Score Weights
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Env weight slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <label htmlFor="slider-env" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Environmental Weight</label>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: '700', color: '#22c55e' }}>{envWeight}%</span>
                </div>
                <input
                  id="slider-env"
                  type="range"
                  min="0"
                  max="100"
                  value={envWeight}
                  onChange={(e) => setEnvWeight(Number(e.target.value))}
                  className="esg-slider esg-slider-env"
                />
              </div>

              {/* Social weight slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <label htmlFor="slider-social" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Social Weight</label>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: '700', color: '#3b82f6' }}>{socialWeight}%</span>
                </div>
                <input
                  id="slider-social"
                  type="range"
                  min="0"
                  max="100"
                  value={socialWeight}
                  onChange={(e) => setSocialWeight(Number(e.target.value))}
                  className="esg-slider esg-slider-social"
                />
              </div>

              {/* Gov weight slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <label htmlFor="slider-gov" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Governance Weight</label>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: '700', color: '#a855f7' }}>{govWeight}%</span>
                </div>
                <input
                  id="slider-gov"
                  type="range"
                  min="0"
                  max="100"
                  value={govWeight}
                  onChange={(e) => setGovWeight(Number(e.target.value))}
                  className="esg-slider esg-slider-gov"
                />
              </div>
            </div>

            {/* Validation indicators */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                Total Weight Sum: <strong style={{ color: isWeightValid ? 'var(--env)' : '#ef4444' }}>{weightSum}%</strong>
              </span>
              {!isWeightValid && (
                <span style={{ fontSize: 'var(--text-sm)', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                  ⚠️ Weights must total 100%
                </span>
              )}
            </div>
          </div>

          {/* Section: Platform Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '600', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Platform Toggles
            </h3>

            {/* Toggle 1: Auto Badge Award */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: 'var(--text-sm)' }}>Auto Badge Award</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Automatically award badges when unlock conditions are met.
                </div>
              </div>
              <label className="ios-toggle-label">
                <input
                  id="toggle-auto-badge"
                  type="checkbox"
                  checked={autoBadge}
                  onChange={(e) => setAutoBadge(e.target.checked)}
                  className="ios-toggle-checkbox"
                />
                <span className="ios-toggle-switch"></span>
              </label>
            </div>

            {/* Toggle 2: Evidence Required */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: 'var(--text-sm)' }}>Evidence Required</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Require proof file upload for CSR activity participation.
                </div>
              </div>
              <label className="ios-toggle-label">
                <input
                  id="toggle-evidence-req"
                  type="checkbox"
                  checked={evidenceRequired}
                  onChange={(e) => setEvidenceRequired(e.target.checked)}
                  className="ios-toggle-checkbox"
                />
                <span className="ios-toggle-switch"></span>
              </label>
            </div>

            {/* Toggle 3: Auto Emission Calc */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', opacity: 0.6 }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Auto Emission Calc <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>(coming soon)</span>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Automatically calculate emissions from ERP data.
                </div>
              </div>
              <label className="ios-toggle-label">
                <input
                  id="toggle-auto-emissions"
                  type="checkbox"
                  checked={autoEmission}
                  disabled
                  className="ios-toggle-checkbox"
                />
                <span className="ios-toggle-switch"></span>
              </label>
            </div>

            {/* Toggle 4: Email Alerts */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', opacity: 0.6 }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Email Alerts <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>(in-app only)</span>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Send email notifications for compliance issues.
                </div>
              </div>
              <label className="ios-toggle-label">
                <input
                  id="toggle-email-alerts"
                  type="checkbox"
                  checked={emailAlerts}
                  disabled
                  className="ios-toggle-checkbox"
                />
                <span className="ios-toggle-switch"></span>
              </label>
            </div>
          </div>

          <button
            id="btn-save-esg"
            className="btn btn-primary"
            onClick={handleEsgSave}
            disabled={!isWeightValid}
            style={{
              display: 'flex',
              gap: '8px',
              width: '100%',
              justifyContent: 'center',
              padding: '0.75rem',
              background: '#22c55e',
              color: '#000',
              fontWeight: '700',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <Save size={16} /> Save Configuration
          </button>
        </div>
      )}

      {/* Notification Settings Tab Panel */}
      {activeTab === 'notifications' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: '0.25rem' }}>Notification Settings</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Configure which notifications you receive in-app.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { key: 'badgeUnlocked', label: 'Badge Unlocked', desc: 'Receive a notification when you unlock a new achievement badge.' },
              { key: 'csrApproved', label: 'CSR Approved', desc: 'Receive a notification when your CSR participation is approved.' },
              { key: 'csrRejected', label: 'CSR Rejected', desc: 'Receive a notification when your CSR participation is rejected.' },
              { key: 'challengeApproved', label: 'Challenge Approved', desc: 'Receive a notification when your challenge completion is approved.' },
              { key: 'challengeRejected', label: 'Challenge Rejected', desc: 'Receive a notification when your challenge completion is rejected.' },
              { key: 'complianceOverdue', label: 'Compliance Overdue', desc: 'Receive a warning notification when a compliance task is overdue.' },
              { key: 'policyReminder', label: 'Policy Reminder', desc: 'Receive a reminder notification when a new ESG policy requires acknowledgement.' },
              { key: 'rewardRedeemed', label: 'Reward Redeemed', desc: 'Receive a confirmation notification when you redeem a reward.' },
            ].map((item) => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{item.desc}</div>
                </div>
                <label className="ios-toggle-label">
                  <input
                    type="checkbox"
                    checked={notifications[item.key as keyof typeof notifications]}
                    onChange={() => handleNotificationToggle(item.key as keyof typeof notifications)}
                    className="ios-toggle-checkbox"
                  />
                  <span className="ios-toggle-switch"></span>
                </label>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', textAlign: 'center' }}>
            Email delivery coming in a future release.
          </div>
        </div>
      )}

      {/* Modal: Department Create/Edit */}
      {isDeptModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="var(--env)" />
              {deptModalMode === 'create' ? 'Create New Department' : 'Edit Department'}
            </h3>

            <form onSubmit={handleDeptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="dept-name" className="form-label">Department Name</label>
                <input
                  id="dept-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Manufacturing Operations"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="dept-code" className="form-label">Department Code</label>
                <input
                  id="dept-code"
                  type="text"
                  className="form-input"
                  placeholder="e.g. MFG"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, code: e.target.value }))}
                  required
                />
              </div>

              {deptModalMode === 'edit' && (
                <div className="form-group">
                  <label htmlFor="dept-status" className="form-label">Status</label>
                  <select
                    id="dept-status"
                    className="form-input"
                    value={deptForm.status}
                    onChange={(e) => setDeptForm((prev) => ({ ...prev, status: e.target.value as any }))}
                    style={{ background: 'var(--bg-input)' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsDeptModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#22c55e', color: '#000', fontWeight: '600' }}
                >
                  {deptModalMode === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Category Create */}
      {isCatModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={20} color="var(--social)" />
              Create New Category
            </h3>

            <form onSubmit={handleCatSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="cat-name" className="form-label">Category Name</label>
                <input
                  id="cat-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Carbon Offsetting"
                  value={catForm.name}
                  onChange={(e) => setCatForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cat-type" className="form-label">Category Type</label>
                <select
                  id="cat-type"
                  className="form-input"
                  value={catForm.type}
                  onChange={(e) => setCatForm((prev) => ({ ...prev, type: e.target.value as any }))}
                  style={{ background: 'var(--bg-input)' }}
                  required
                >
                  <option value="CSR_ACTIVITY">CSR Activity</option>
                  <option value="CHALLENGE">Challenge</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCatModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#22c55e', color: '#000', fontWeight: '600' }}
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

export default SettingsPage;
