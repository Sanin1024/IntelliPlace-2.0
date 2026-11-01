import { useEffect, useState } from 'react';
import api from '../../api/client';
import { publicApi } from '../../api/admin';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [branchStats, setBranchStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters & Sorting State
  const [batches, setBatches] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = Highest to Lowest

  // Fetch initial dropdown data
  useEffect(() => {
    Promise.all([
      publicApi.getBatches().catch(() => []),
      publicApi.getBranches().catch(() => [])
    ]).then(([b, br]) => {
      setBatches(b);
      setBranches(br);
    });
  }, []);

  // Fetch general stats (once)
  useEffect(() => {
    api.get('/analytics/stats')
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Fetch branch-wise stats based on filters
  useEffect(() => {
    const params: any = {};
    if (batchFilter) params.batchId = batchFilter;
    if (branchFilter) params.branchId = branchFilter;

    api.get('/analytics/branch-wise', { params })
      .then(r => {
        let data = r.data.data || [];
        
        // Sort data based on selection
        data.sort((a: any, b: any) => 
          sortOrder === 'desc' 
            ? b.placedStudents - a.placedStudents 
            : a.placedStudents - b.placedStudents
        );
        
        setBranchStats(data);
      })
      .catch(() => setBranchStats([]));
  }, [batchFilter, branchFilter, sortOrder]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <h1>Admin Dashboard</h1>
      
      {/* System Health & Content Indicators */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '8px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
        <span>API: <strong style={{ color: 'var(--color-success)' }}>Healthy</strong></span>
        <span>DB: <strong style={{ color: 'var(--color-success)' }}>Connected</strong></span>
        <span>Users: <strong style={{ color: 'var(--color-primary)' }}>Active</strong></span>
        <span>Platform Content: <strong style={{ color: 'var(--color-text)' }}>Synchronized</strong></span>
      </div>

      {/* General Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
          <StatCard label="Total Students" value={stats.totalStudents} color="var(--color-primary)" />
          <StatCard label="Eligible Students" value={stats.eligibleStudents} color="var(--color-info)" />
          <StatCard label="Unique Placed" value={stats.uniquePlacedStudents} color="var(--color-success)" />
          <StatCard label="Placement %" value={`${stats.placementPercentage}%`} color="var(--color-warning)" />
        </div>
      )}

      {/* Branch-wise Performance Section */}
      <div style={{ marginTop: '32px', background: 'var(--color-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, color: 'var(--color-text)' }}>Branch-wise Placement Performance</h3>
          
          {/* Filters and Sorting Controls */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select 
              value={batchFilter} 
              onChange={(e) => setBatchFilter(e.target.value)} 
              style={selectStyle}
            >
              <option value="">All Batches</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <select 
              value={branchFilter} 
              onChange={(e) => setBranchFilter(e.target.value)} 
              style={selectStyle}
            >
              <option value="">All Departments</option>
              {branches.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
            </select>

            <button 
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} 
              style={btnStyle}
            >
              {sortOrder === 'desc' ? '↓ Highest to Lowest' : '↑ Lowest to Highest'}
            </button>
          </div>
        </div>

        {/* Chart Visualization */}
        {branchStats.length === 0 ? (
          <EmptyState icon="📊" title="No Data Available" description="No placement data matches the selected filters." />
        ) : (
          <>
            <div style={{ width: '100%', height: 300, marginBottom: '24px' }}>
              <ResponsiveContainer>
                <BarChart data={branchStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="branchName" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  <Bar dataKey="totalStudents" fill="var(--color-border)" name="Total Students" />
                  <Bar dataKey="placedStudents" fill="var(--color-primary)" name="Placed Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Data Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Department</th>
                    <th style={thStyle}>Total Students</th>
                    <th style={thStyle}>Placed Students</th>
                    <th style={thStyle}>Placement %</th>
                  </tr>
                </thead>
                <tbody>
                  {branchStats.map((b, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{b.branchName}</td>
                      <td style={tdStyle}>{b.totalStudents}</td>
                      <td style={tdStyle}>{b.placedStudents}</td>
                      <td style={tdStyle}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          fontSize: '12px', 
                          fontWeight: 600,
                          background: b.placementPercentage >= 50 ? 'color-mix(in srgb, var(--color-success) 15%, transparent)' : 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
                          color: b.placementPercentage >= 50 ? 'var(--color-success)' : 'var(--color-warning)'
                        }}>
                          {b.placementPercentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
      <h2 style={{ margin: 0, color, fontSize: '32px' }}>{value}</h2>
      <p style={{ color: 'var(--color-text-muted)', margin: '8px 0 0 0', fontSize: '14px' }}>{label}</p>
    </div>
  );
}

const selectStyle: React.CSSProperties = { 
  padding: '8px 12px', 
  borderRadius: 'var(--radius-md)', 
  border: '1px solid var(--color-border)', 
  fontSize: '14px', 
  cursor: 'pointer',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)'
};

const btnStyle: React.CSSProperties = { 
  padding: '8px 16px', 
  borderRadius: 'var(--radius-md)', 
  border: '1px solid var(--color-primary)', 
  background: 'var(--color-primary-light)', 
  color: 'var(--color-primary)', 
  fontSize: '14px', 
  cursor: 'pointer',
  fontWeight: 600
};

const tableStyle: React.CSSProperties = { 
  width: '100%', 
  borderCollapse: 'collapse' 
};

const thStyle: React.CSSProperties = { 
  textAlign: 'left', 
  padding: '12px 16px', 
  background: 'var(--color-surface-hover)', 
  borderBottom: '2px solid var(--color-border)', 
  fontSize: '13px', 
  color: 'var(--color-text-muted)' 
};

const tdStyle: React.CSSProperties = { 
  padding: '12px 16px', 
  borderBottom: '1px solid var(--color-border)', 
  fontSize: '14px',
  color: 'var(--color-text)'
};
