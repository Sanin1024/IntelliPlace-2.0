import { useEffect, useState } from 'react';
import { userApi } from '../../api/admin';
import type { AdminUser } from '../../types';

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'trainer' });
  const [filterRole, setFilterRole] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      const data = filterRole ? await userApi.getAll({ role: filterRole }) : await userApi.getAll();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterRole]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await userApi.create(formData);
      setSuccess(`User ${formData.email} created successfully`);
      setFormData({ name: '', email: '', password: '', role: 'trainer' });
      setShowCreateForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleToggle = async (user: AdminUser) => {
    try {
      await userApi.toggleStatus(user.id, !user.isActive);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle status');
    }
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Manage Users</h1>
        <button onClick={() => setShowCreateForm(!showCreateForm)} style={primaryBtn}>
          + Create User (PO/Trainer/Admin)
        </button>
      </div>

      {error && <div style={{ ...alert, background: '#fee', color: '#c00' }}>{error}</div>}
      {success && <div style={{ ...alert, background: '#f0fdf4', color: '#166534' }}>{success}</div>}

      {showCreateForm && (
        <form onSubmit={handleCreate} style={{ ...card, marginBottom: '24px' }}>
          <h3>Create New Staff User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={label}>Name</label>
              <input
                type="text" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required minLength={2} style={input} placeholder="Full name"
              />
            </div>
            <div>
              <label style={label}>Email</label>
              <input
                type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required style={input} placeholder="user@intelliplace.edu"
              />
            </div>
            <div>
              <label style={label}>Password (min 8 chars)</label>
              <input
                type="password" value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required minLength={8} style={input}
              />
            </div>
            <div>
              <label style={label}>Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={input}
              >
                <option value="trainer">Trainer</option>
                <option value="po">Placement Officer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" style={{ ...primaryBtn, marginTop: '16px' }}>Create</button>
        </form>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={label}>Filter by role: </label>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={input}>
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="po">Placement Officer</option>
          <option value="trainer">Trainer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="table-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={td}>{u.name}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>
                  <span style={roleBadge(u.role)}>{u.role}</span>
                </td>
                <td style={td}>
                  <span style={{ color: u.isActive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td style={td}>
                  {u.role !== 'student' && (
                    <button
                      onClick={() => handleToggle(u)}
                      style={{
                        ...smallBtn,
                        background: u.isActive ? '#fee2e2' : '#f0fdf4',
                        color: u.isActive ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function roleBadge(role: string): React.CSSProperties {
  const colors: Record<string, string> = {
    admin: '#7c3aed', po: '#0891b2', trainer: '#d97706', student: '#2563eb',
  };
  return {
    background: `${colors[role]}20`, color: colors[role],
    padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
  };
}

const input: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', width: '100%', boxSizing: 'border-box', marginTop: '4px' };
const label: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#475569' };
const primaryBtn: React.CSSProperties = { padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' };
const smallBtn: React.CSSProperties = { padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', color: '#64748b' };
const td: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };
const alert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' };
const card: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' };