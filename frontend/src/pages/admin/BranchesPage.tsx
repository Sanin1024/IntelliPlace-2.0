import { useEffect, useState } from 'react';
import { branchApi } from '../../api/admin';
import type { Branch } from '../../types';

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      setBranches(await branchApi.getAll());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await branchApi.update(editingId, { name });
        setEditingId(null);
      } else {
        await branchApi.create({ name });
      }
      setName('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this branch?')) return;
    try {
      await branchApi.delete(id);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Manage Branches</h1>
      {error && <div style={{ ...alertStyle, background: '#fee', color: '#c00' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Branch name (e.g., Mechanical)"
          required
          minLength={2}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="submit" style={primaryBtn}>
          {editingId ? 'Update' : 'Add Branch'}
        </button>
        {editingId && (
          <button type="button" onClick={() => { setEditingId(null); setName(''); }} style={secondaryBtn}>
            Cancel
          </button>
        )}
      </form>

      <div className="table-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Students</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id}>
                <td style={tdStyle}>{b.id}</td>
                <td style={tdStyle}>{b.name}</td>
                <td style={tdStyle}>{b._count?.students ?? 0}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => { setEditingId(b.id); setName(b.name); }}
                    style={{ ...smallBtn, marginRight: '8px' }}
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDelete(b.id)} style={{ ...smallBtn, background: '#fee2e2', color: '#dc2626' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {branches.length === 0 && (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center' }}>No branches yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px',
};
const primaryBtn: React.CSSProperties = {
  padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  padding: '10px 20px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer',
};
const smallBtn: React.CSSProperties = {
  padding: '6px 12px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
};
const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden',
};
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '12px 16px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', color: '#64748b',
};
const tdStyle: React.CSSProperties = {
  padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px',
};
const alertStyle: React.CSSProperties = {
  padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
};