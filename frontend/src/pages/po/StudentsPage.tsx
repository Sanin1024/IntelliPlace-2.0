import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { poApi } from '../../api/po';
import { publicApi } from '../../api/admin';
import type { StudentRow, StudentSummary } from '../../api/po';

export default function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const params: any = {};
      if (filterBranch) params.branchId = filterBranch;
      if (filterBatch) params.batchId = filterBatch;
      if (filterStatus) params.placementStatus = filterStatus;
      if (filterLevel) params.knowledgeLevel = filterLevel;
      if (search) params.search = search;

      const data = await poApi.getAllStudents(params);
      setStudents(data.students);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    publicApi.getBranches().then(setBranches).catch(() => setBranches([]));
    publicApi.getBatches().then(setBatches).catch(() => setBatches([]));
    load();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(load, 300); // Debounce search
    return () => clearTimeout(timeout);
  }, [search, filterBranch, filterBatch, filterStatus, filterLevel]);

  const handleStatusChange = async (studentId: string, newStatus: string) => {
    try {
      await poApi.updatePlacementStatus(studentId, newStatus);
      // Update local state
      setStudents(prev =>
        prev.map(s =>
          s.studentId === studentId ? { ...s, placementStatus: newStatus } : s
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'placed': return { bg: '#f0fdf4', color: '#16a34a' };
      case 'in_process': return { bg: '#fffbeb', color: '#d97706' };
      default: return { bg: '#f8fafc', color: '#64748b' };
    }
  };

  const readinessColor = (score: number) => {
    if (score > 70) return '#16a34a';
    if (score >= 40) return '#d97706';
    return '#dc2626';
  };

  if (isLoading) return <p>Loading students...</p>;

  return (
    <div>
      <h1>Student Management</h1>
      <p style={{ color: '#64748b' }}>Monitor placement readiness across all students.</p>

      {error && <div style={errAlert}>{error}</div>}

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '20px' }}>
          <div style={statCard}>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#1a73e8' }}>{summary.totalStudents}</h2>
            <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '13px' }}>Total Students</p>
          </div>
          <div style={statCard}>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#16a34a' }}>{summary.placed}</h2>
            <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '13px' }}>Placed</p>
          </div>
          <div style={statCard}>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#d97706' }}>{summary.inProcess}</h2>
            <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '13px' }}>In Process</p>
          </div>
          <div style={statCard}>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#64748b' }}>{summary.notPlaced}</h2>
            <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '13px' }}>Not Placed</p>
          </div>
          <div style={statCard}>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#7c3aed' }}>{summary.avgReadiness}</h2>
            <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '13px' }}>Avg Readiness</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          aria-label="Search by name or email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by name or email..."
          style={{ ...inp, flex: 1, minWidth: '200px' }}
        />
        <select aria-label="Filter by branch" value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{...inp, width: '140px'}}>
          <option value="">All branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select aria-label="Filter by batch" value={filterBatch} onChange={e => setFilterBatch(e.target.value)} style={{...inp, width: '120px'}}>
          <option value="">All batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select aria-label="Filter by status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{...inp, width: '140px'}}>
          <option value="">All statuses</option>
          <option value="not_placed">Not Placed</option>
          <option value="in_process">In Process</option>
          <option value="placed">Placed</option>
        </select>
        <select aria-label="Filter by level" value={filterLevel} onChange={e => setFilterLevel(e.target.value)} style={{...inp, width: '140px'}}>
          <option value="">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Student Table */}
      <div tabIndex={0} aria-label="Student Management Table" style={{ overflowX: 'auto' }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Branch</th>
              <th style={th}>Batch</th>
              <th style={th}>CGPA</th>
              <th style={th}>Level</th>
              <th style={th}>Mock Tests</th>
              <th style={th}>Avg Score</th>
              <th style={th}>Readiness</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const sc = statusColor(s.placementStatus);
              const rc = readinessColor(s.readinessScore);
              return (
                <tr key={s.studentId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/po/students/${s.studentId}`)}>
                  <td style={td}>
                    <strong>{s.name}</strong>
                    {s.ktuid && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#6366f1', fontWeight: 600, background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>
                        {s.ktuid}
                      </span>
                    )}
                    <br />
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{s.email}</span>
                  </td>
                  <td style={td}>{s.branch || '-'}</td>
                  <td style={td}>{s.batch || '-'}</td>
                  <td style={td}>{s.cgpa ?? '-'}</td>
                  <td style={td}>
                    <span style={{ fontSize: '12px', textTransform: 'capitalize', color: '#64748b' }}>
                      {s.knowledgeLevel}
                    </span>
                  </td>
                  <td style={td}>{s.mockTestsTaken}</td>
                  <td style={td}>{s.avgMockScore !== null ? `${s.avgMockScore}%` : '-'}</td>
                  <td style={td}>
                    <span style={{
                      display: 'inline-block', width: '36px', textAlign: 'center',
                      padding: '2px 6px', borderRadius: '8px',
                      background: `${rc}15`, color: rc, fontWeight: 700, fontSize: '13px',
                    }}>
                      {s.readinessScore}
                    </span>
                  </td>
                  <td style={td} onClick={e => e.stopPropagation()}>
                    <select
                      aria-label={`Placement status for ${s.name}`}
                      value={s.placementStatus}
                      onChange={e => handleStatusChange(s.studentId, e.target.value)}
                      style={{
                        padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0',
                        fontSize: '12px', fontWeight: 600, background: sc.bg, color: sc.color,
                        cursor: 'pointer', minHeight: '40px',
                      }}
                    >
                      <option value="not_placed">Not Placed</option>
                      <option value="in_process">In Process</option>
                      <option value="placed">Placed</option>
                    </select>
                  </td>
                  <td style={td} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/po/students/${s.studentId}`)}
                      style={btnSmall}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {students.length === 0 && (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
            No students match these filters.
          </p>
        )}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', minHeight: '40px', boxSizing: 'border-box' };
const statCard: React.CSSProperties = { background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', verticalAlign: 'middle' };
const btnSmall: React.CSSProperties = { padding: '8px 14px', minHeight: '40px', display: 'inline-flex', alignItems: 'center', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 };
const errAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#fee2e2', color: '#dc2626' };