import { useState } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../../components/EmptyState';

export default function BulkImportPage() {
  const [jsonText, setJsonText] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  const handleImport = async () => {
    setIsLoading(true);
    setResults(null);
    try {
      const students = JSON.parse(jsonText);
      if (!Array.isArray(students)) throw new Error("Input must be a JSON array.");
      
      const r = await api.post('/admin/students/bulk-import', { students });
      setResults(r.data.data);
      addToast(`Import complete: ${r.data.data.success} success, ${r.data.data.failed} failed`, 'success');
    } catch (e: any) {
      addToast(e.response?.data?.error || e.message || 'Invalid JSON', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Bulk Import Students</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Paste a JSON array of students. Format: {"{ name, email, universityId, branchName, batchName, admissionYear, cgpa }"}
      </p>
      
      <div style={card}>
        <textarea 
          value={jsonText} 
          onChange={e => setJsonText(e.target.value)} 
          rows={10} 
          placeholder='[{"name": "John Doe", "email": "john@xyz.com", "ktuid": "KSD23CS001", "branchName": "CSE", "batchName": "2023-2027", "admissionYear": 2023, "cgpa": 8.5}]'
          style={{ width: '100%', padding: '12px', fontFamily: 'monospace', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} 
        />
        <button onClick={handleImport} disabled={isLoading || !jsonText} style={btnP}>
          {isLoading ? 'Importing...' : 'Run Import'}
        </button>
      </div>

      {results && (
        <div style={{ marginTop: '24px' }}>
          <h3>Results: {results.success} Success, {results.failed} Failed</h3>
          {results.errors?.length > 0 ? (
            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '8px', marginTop: '12px' }}>
              <h4 style={{ color: '#dc2626', marginTop: 0 }}>Errors:</h4>
              {results.errors.map((e: any, i: number) => (
                <p key={i} style={{ fontSize: '13px', margin: '4px 0', color: '#475569' }}>
                  Row {e.row} ({e.email}): <span style={{ color: '#dc2626' }}>{e.error}</span>
                </p>
              ))}
            </div>
          ) : (
            <EmptyState icon="🎉" title="Perfect Import!" description="All student records were successfully created." />
          )}
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' };
const btnP: React.CSSProperties = { marginTop: '16px', padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 };
