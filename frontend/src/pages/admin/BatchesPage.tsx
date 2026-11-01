import { useEffect, useState } from 'react';
import { batchApi } from '../../api/admin';
import type { Batch } from '../../types';

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [name, setName] = useState('');
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear() + 1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      setBatches(await batchApi.getAll());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load batches');
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
        await batchApi.update(editingId, { name, graduationYear: Number(graduationYear) });
        setEditingId(null);
      } else {
        await batchApi.create({ name, graduationYear: Number(graduationYear) });
      }
      setName('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this batch?')) return;
    try {
      await batchApi.delete(id);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Manage Batches</h1>
      {error && <div style={{ ...alert, background: '#fee', color: '#c00' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          aria-label="Batch name"
          placeholder="Batch name (e.g., 2027)" required minLength={2}
          style={{ ...input, flex: 1 }}
        />
        <input
          type="number" value={graduationYear} onChange={(e) => setGraduationYear(Number(e.target.value))}
          aria-label="Graduation year"
          min={2020} max={2035} required style={input}
        />
        <button type="submit" style={primaryBtn}>
          {editingId ? 'Update' : 'Add Batch'}
        </button>
        {editingId && (
          <button type="button" onClick={() => { setEditingId(null); setName(''); }} style={secondaryBtn}>
            Cancel
          </button>
        )}
      </form>

      <div tabIndex={0} aria-label="Batches Table" className="table-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Name</th>
              <th style={th}>Graduation Year</th>
              <th style={th}>Students</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td style={td}>{b.id}</td>
                <td style={td}>{b.name}</td>
                <td style={td}>{b.graduationYear}</td>
                <td style={td}>{b._count?.students ?? 0}</td>
                <td style={td}>
                  <button
                    onClick={() => { setEditingId(b.id); setName(b.name); setGraduationYear(b.graduationYear); }}
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
          </tbody>
        </table>
      </div>
    </div>
  );
}

const input: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', minHeight: '40px', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { padding: '10px 20px', minHeight: '40px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' };
const secondaryBtn: React.CSSProperties = { padding: '10px 20px', minHeight: '40px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer' };
const smallBtn: React.CSSProperties = { padding: '8px 12px', minHeight: '40px', display: 'inline-flex', alignItems: 'center', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', color: '#64748b' };
const td: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };
const alert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' };