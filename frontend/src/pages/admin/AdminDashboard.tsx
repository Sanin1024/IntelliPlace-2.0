import { useEffect, useState } from 'react';
import { branchApi, batchApi, userApi } from '../../api/admin';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ branches: 0, batches: 0, users: 0 });

  useEffect(() => {
    Promise.all([branchApi.getAll(), batchApi.getAll(), userApi.getAll()])
      .then(([branches, batches, users]) => {
        setStats({ branches: branches.length, batches: batches.length, users: users.length });
      })
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
        <StatCard label="Total Users" value={stats.users} color="#3b82f6" />
        <StatCard label="Branches" value={stats.branches} color="#10b981" />
        <StatCard label="Batches" value={stats.batches} color="#f59e0b" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
      <h2 style={{ margin: 0, color, fontSize: '36px' }}>{value}</h2>
      <p style={{ color: '#64748b', margin: '8px 0 0 0' }}>{label}</p>
    </div>
  );
}