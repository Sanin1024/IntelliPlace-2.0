import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function AssessmentManagementPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [showSlotForm, setShowSlotForm] = useState(false);

  const loadData = async () => {
    const [pendRes, slotRes] = await Promise.all([
      api.get('/assessments/pending').catch(() => ({ data: { data: [] } })),
      api.get('/assessments/slots').catch(() => ({ data: { data: [] } })) // Need to implement slot list endpoint or reuse
    ]);
    setPending(pendRes.data?.data || []);
    setSlots(slotRes.data?.data || []);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    await api.post('/assessments/slots', {
      startTime: new Date(String(data.startTime)).toISOString(),
      endTime: new Date(String(data.endTime)).toISOString(),
      location: data.location,
      capacity: Number(data.capacity)
    });
    setShowSlotForm(false);
    loadData();
  };

  const handleAssign = async (assessmentId: string, slotId: string) => {
    await api.patch(`/assessments/${assessmentId}/assign`, { slotId });
    loadData();
  };

  const handleExtension = async (assessmentId: string) => {
    const days = prompt('Extend deadline by how many days?', '3');
    if (!days) return;
    const reason = prompt('Reason for extension?', 'Personal reason');
    await api.patch(`/assessments/${assessmentId}/extension`, {
      newDeadline: new Date(Date.now() + Number(days) * 86400000).toISOString(),
      reason: reason || 'N/A'
    });
    loadData();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Preliminary Assessments</h1>
        <button onClick={() => setShowSlotForm(!showSlotForm)} style={btnPrimary}>
          {showSlotForm ? 'Cancel' : '+ Create Slot'}
        </button>
      </div>

      {showSlotForm && (
        <form onSubmit={handleCreateSlot} style={card}>
          <h3>New Assessment Slot</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input type="datetime-local" name="startTime" required style={inp} />
            <input type="datetime-local" name="endTime" required style={inp} />
            <input type="text" name="location" placeholder="Location/Meet Link" style={inp} />
            <input type="number" name="capacity" placeholder="Capacity" defaultValue={50} min={1} style={inp} />
          </div>
          <button type="submit" style={{...btnPrimary, marginTop: '12px'}}>Create</button>
        </form>
      )}

      <h3 style={{ marginTop: '24px' }}>Pending & Overdue Students</h3>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Student</th>
            <th style={th}>Status</th>
            <th style={th}>Deadline</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pending.map(a => (
            <tr key={a.id}>
              <td style={td}>{a.student.name}</td>
              <td style={td}>
                <span style={{
                  padding: '4px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                  background: a.status === 'overdue' ? '#fef2f2' : '#f0fdf4',
                  color: a.status === 'overdue' ? '#dc2626' : '#16a34a'
                }}>{a.status}</span>
              </td>
              <td style={td}>{new Date(a.deadline).toLocaleString()}</td>
              <td style={td}>
                {slots.length > 0 ? (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleAssign(a.id, e.target.value);
                    }}
                    style={{ ...btnSmall, background: '#fff', border: '1px solid #cbd5e1' }}
                  >
                    <option value="" disabled>Assign slot...</option>
                    {slots.map(s => (
                      <option key={s.id} value={s.id}>
                        {new Date(s.startTime).toLocaleDateString()} {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({s._count?.assessments || 0}/{s.capacity})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>No slots</span>
                )}
                <button onClick={() => handleExtension(a.id)} style={{...btnSmall, marginLeft: '8px', background: '#fef3c7', color: '#d97706'}}>Extend</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' };
const inp: React.CSSProperties = { padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '100%' };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' };
const btnSmall: React.CSSProperties = { padding: '4px 10px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px', borderBottom: '2px solid #e2e8f0', fontSize: '12px' };
const td: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };