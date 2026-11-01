import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function AdminSettingsPage() {
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/settings');
      const raw = res.data?.data;
      const map: Record<string, string> = {};
      if (Array.isArray(raw)) {
        raw.forEach((s: any) => {
          if (s?.key) map[s.key] = String(s.value ?? '');
        });
      } else if (raw && typeof raw === 'object') {
        Object.entries(raw).forEach(([k, v]) => {
          map[k] = String(v ?? '');
        });
      }
      setSettingsMap(map);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (key: string) => {
    try {
      await api.put('/admin/settings', { key, value: editValue, settings: { [key]: editValue } });
      addToast('Setting updated', 'success');
      setEditingKey(null);
      load(); // Refresh
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save', 'error');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <EmptyState icon="⚠️" title="Error" description={error} />;

  const settingKeys = Object.keys(settingsMap);

  return (
    <div>
      <h1>System Configuration</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>Configure global thresholds, weights, and limits.</p>
      
      {settingKeys.length === 0 ? (
        <EmptyState icon="⚙️" title="No Settings Configured" description="Default settings are currently in use." />
      ) : (
        <div style={card}>
          {settingKeys.map(key => (
            <div key={key} style={{ padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
              <strong style={{ fontFamily: 'monospace', fontSize: '14px' }}>{key}</strong>
              {editingKey === key ? (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <input 
                    value={editValue} 
                    onChange={e => setEditValue(e.target.value)} 
                    style={inp} 
                  />
                  <button onClick={() => save(key)} style={btnP}>Save</button>
                  <button onClick={() => setEditingKey(null)} style={btnS}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', alignItems: 'center' }}>
                  <span style={{ color: '#475569', fontSize: '14px', wordBreak: 'break-all' }}>{settingsMap[key]}</span>
                  <button 
                    onClick={() => { setEditingKey(key); setEditValue(settingsMap[key]); }} 
                    style={btnS}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' };
const inp: React.CSSProperties = { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', width: '60%' };
const btnP: React.CSSProperties = { padding: '8px 16px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 };
const btnS: React.CSSProperties = { padding: '8px 16px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer' };
