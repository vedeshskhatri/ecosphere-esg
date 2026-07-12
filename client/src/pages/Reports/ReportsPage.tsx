import React, { useEffect, useState } from 'react';
import { useEsgStore } from '../../store/esgStore';
import api from '../../lib/api';
import { FileDown, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const ReportsPage: React.FC = () => {
  const { departments, fetchSettingsData } = useEsgStore();
  const [reportType, setReportType] = useState<'environmental' | 'social' | 'governance' | 'summary'>('summary');
  
  // Dynamic filter values
  const [deptId, setDeptId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Aggregate details loaded for preview
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettingsData();
  }, [fetchSettingsData]);

  // Load preview data when report type or filters change
  useEffect(() => {
    const loadPreview = async () => {
      setLoading(true);
      try {
        let url = `/reports/${reportType}?`;
        if (deptId) url += `departmentId=${deptId}&`;
        if (startDate) url += `startDate=${startDate}&`;
        if (endDate) url += `endDate=${endDate}&`;

        const res: any = await api.get(url);
        setPreviewData(res.data.data);
      } catch (err) {
        console.error('Failed to load report preview:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [reportType, deptId, startDate, endDate]);

  const applyPreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === 'this-week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(today.getFullYear(), today.getMonth(), diff);
      end = new Date();
    } else if (preset === 'this-month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date();
    } else if (preset === 'quarterly') {
      const quarter = Math.floor(today.getMonth() / 3);
      start = new Date(today.getFullYear(), quarter * 3, 1);
      end = new Date();
    } else if (preset === 'annually') {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date();
    } else if (preset === 'financial-year') {
      // Financial year starts April 1st.
      const currentYear = today.getFullYear();
      const startYear = today.getMonth() >= 3 ? currentYear : currentYear - 1;
      start = new Date(startYear, 3, 1);
      end = new Date();
    }

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both Start Date and End Date to export the report.');
      return;
    }

    const loadingToastId = toast.loading('Preparing CSV export...');
    try {
      const res = await api.get(`/reports/export?type=${reportType}&departmentId=${deptId}&startDate=${startDate}&endDate=${endDate}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ecosphere_${reportType}_report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.dismiss(loadingToastId);
      toast.success('Report downloaded successfully!');
    } catch (err: any) {
      console.error(err);
      toast.dismiss(loadingToastId);
      toast.error('Failed to download report export.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: '700', letterSpacing: '-0.025em', margin: 0, color: '#19350C' }}>
          ESG Report Builder
        </h1>
        <span style={{ fontSize: 'var(--text-sm)', color: '#687D31', marginTop: '2px', display: 'inline-block' }}>
          Compile compliance disclosures, audit reports, and download environmental CSV datasets.
        </span>
      </div>

      {/* Dynamic Filters Bar */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
        <div>
          <label className="label">Report Subject</label>
          <select className="input" value={reportType} onChange={(e: any) => setReportType(e.target.value)}>
            <option value="summary">ESG Summary Report</option>
            <option value="environmental">Environmental Emissions Report</option>
            <option value="social">Social Activity Report</option>
            <option value="governance">Governance Audit Report</option>
          </select>
        </div>

        <div>
          <label className="label">Department Filter</label>
          <select className="input" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Quick Preset</label>
          <select 
            className="input" 
            onChange={(e) => applyPreset(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Select range...</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="quarterly">Quarterly</option>
            <option value="annually">Annually</option>
            <option value="financial-year">This Financial Year</option>
          </select>
        </div>

        <div>
          <label className="label">Start Date *</label>
          <input type="date" className="input" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div>
          <label className="label">End Date *</label>
          <input type="date" className="input" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div style={{ justifySelf: 'end', marginTop: '1.25rem' }}>
          <button onClick={handleExport} className="btn btn-primary" style={{ gap: '6px' }}>
            <FileDown size={16} /> Export (CSV)
          </button>
        </div>
      </div>

      {/* Dynamic Report Preview */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="var(--insight)" /> Report Data Live Preview
        </h3>
        
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Recalculating statistics...
          </div>
        ) : !previewData ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No statistics available for selected filters.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            {/* Environmental preview data */}
            {reportType === 'environmental' && (
              <>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>TOTAL EMISSIONS LOGGED</span>
                  <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: '800', color: 'var(--env)', marginTop: '4px' }}>
                    {previewData.totalEmissionsCo2 || 0} kg CO₂
                  </h2>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>SCOPE 1 EMISSIONS (DIRECT)</span>
                  <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                    {previewData.byScope?.find((s: any) => s.name === 'SCOPE1')?.co2 || 0} kg
                  </h2>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>SCOPE 2 EMISSIONS (INDIRECT)</span>
                  <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                    {previewData.byScope?.find((s: any) => s.name === 'SCOPE2')?.co2 || 0} kg
                  </h2>
                </div>
              </>
            )}

            {/* Social preview data */}
            {reportType === 'social' && (
              <>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>VOLUNTEER HOURS</span>
                  <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: '800', color: 'var(--social)', marginTop: '4px' }}>
                    {previewData.volunteerHours || 0} hours
                  </h2>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>APPROVED PARTICIPATIONS</span>
                  <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                    {previewData.approvedParticipations || 0} completions
                  </h2>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>PENDING IN APPROVAL QUEUE</span>
                  <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                    {previewData.pendingParticipations || 0} items
                  </h2>
                </div>
              </>
            )}

            {/* Governance preview data */}
            {reportType === 'governance' && (
              <>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>COMPLETED INTERNAL AUDITS</span>
                  <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: '800', color: 'var(--gov)', marginTop: '4px' }}>
                    {previewData.auditStatusCounts?.COMPLETED || 0} / {previewData.totalAudits || 0}
                  </h2>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>RESOLVED COMPLIANCE INCIDENTS</span>
                  <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                    {previewData.issueStatusCounts?.RESOLVED || 0} / {previewData.totalIssues || 0}
                  </h2>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>OVERDUE SLA ISSUES</span>
                  <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: '700', color: 'var(--severity-high)', marginTop: '4px' }}>
                    {previewData.overdueCount || 0} critical
                  </h2>
                </div>
              </>
            )}

            {/* ESG Summary preview data */}
            {reportType === 'summary' && (
              <>
                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)', gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>ORGANIZATION ESG AVERAGE</span>
                  <h2 style={{ fontSize: 'var(--text-4xl)', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                    {previewData.orgScore || 0}%
                  </h2>
                </div>
                {previewData.departmentScores?.map((ds: any) => (
                  <div key={ds.departmentId} style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{ds.name}</span>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '700', color: 'var(--gov)', marginTop: '4px' }}>
                      {ds.totalScore}%
                    </h3>
                  </div>
                ))}
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
