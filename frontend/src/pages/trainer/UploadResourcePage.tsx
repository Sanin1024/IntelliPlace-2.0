import { useEffect, useState, useRef } from 'react';
import { resourceApi } from '../../api/resource';
import { publicApi } from '../../api/admin';
import { trainingApi } from '../../api/training';
import type { Resource } from '../../api/resource';

export default function UploadResourcePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicId, setTopicId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setResources(await resourceApi.getAll());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    publicApi.getTopics().then(setTopics).catch(() => setTopics([]));
    load();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!file) {
      setError('Please select a file');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      if (description) formData.append('description', description);
      if (topicId) formData.append('topicId', topicId);

      await resourceApi.upload(formData);
      setSuccess(`"${file.name}" uploaded successfully`);
      setTitle('');
      setDescription('');
      setTopicId('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resource?')) return;
    try {
      await resourceApi.delete(id);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return '📄';
    if (['doc', 'docx', 'txt', 'md'].includes(ext || '')) return '📝';
    if (['ppt', 'pptx'].includes(ext || '')) return '📊';
    if (['mp4', 'avi', 'mkv'].includes(ext || '')) return '🎥';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return '🖼️';
    if (['mp3'].includes(ext || '')) return '🎵';
    return '📁';
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Learning Resources</h1>
      <p style={{ color: '#64748b' }}>Upload study materials for students. Max file size: 100MB.</p>

      {error && <div style={errAlert}>{error}</div>}
      {success && <div style={okAlert}>{success}</div>}

      <form onSubmit={handleUpload} style={formCard}>
        <h3>Upload New Resource</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label htmlFor="resource-title" style={lbl}>Title</label>
            <input
              id="resource-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={async () => {
                if (title.trim().length >= 3) {
                  try {
                    const check = await trainingApi.checkDuplicate({ title: title.trim() });
                    if (check?.isDuplicate) {
                      setDuplicateWarning(`Potential duplicate detected: "${check.duplicateOf.title}" (v${check.duplicateOf.version}). Ensure you are not uploading redundant material.`);
                    } else {
                      setDuplicateWarning(null);
                    }
                  } catch {
                    // non-blocking
                  }
                }
              }}
              required
              minLength={3}
              style={inp}
              placeholder="e.g., Quantitative Aptitude - Complete Notes"
            />
            {duplicateWarning && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#b45309', background: '#fffbeb', padding: '6px 10px', borderRadius: '4px', border: '1px solid #fef3c7' }}>
                ⚠️ {duplicateWarning}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="resource-topic" style={lbl}>Topic (optional)</label>
            <select id="resource-topic" aria-label="Topic (optional)" value={topicId} onChange={e => setTopicId(e.target.value)} style={inp}>
              <option value="">No specific topic</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <label htmlFor="resource-desc" style={lbl}>Description (optional)</label>
          <input id="resource-desc" type="text" value={description} onChange={e => setDescription(e.target.value)} style={inp} placeholder="Brief description of the content" />
        </div>
        <div style={{ marginTop: '12px' }}>
          <label htmlFor="resource-file" style={lbl}>File (PDF, DOC, PPT, MP4, images — max 100MB)</label>
          <input id="resource-file" aria-label="File upload" ref={fileInputRef} type="file" onChange={e => setFile(e.target.files?.[0] || null)} required style={{ ...inp, padding: '8px' }} />
        </div>
        {file && (
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
            Selected: {getFileIcon(file.name)} {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
        <button type="submit" disabled={isUploading} style={{ ...btnPrimary, marginTop: '16px', minHeight: '40px' }}>
          {isUploading ? 'Uploading...' : '⬆️ Upload Resource'}
        </button>
      </form>

      <h3 style={{ marginTop: '32px' }}>Uploaded Resources ({resources.length})</h3>
      {resources.map(r => (
        <div key={r.id} style={resourceCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>
                {getFileIcon(r.fileUrl)} {r.title}
              </p>
              {r.description && <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px 0' }}>{r.description}</p>}
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                {r.topic?.name && <span style={{ color: '#4338ca' }}>{r.topic.name}</span>}
                {r.topic?.name && ' • '}
                Uploaded by {r.uploader?.name} on {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`http://localhost:4000/api/resources/${r.id}/download`, {
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                    });
                    if (!res.ok) throw new Error('Download failed');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${r.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch {
                    alert('Error downloading resource');
                  }
                }}
                style={btnSmall}
              >
                Download
              </button>
              <button onClick={() => handleDelete(r.id)} style={{...btnSmall, background: '#fee2e2', color: '#dc2626'}}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', width: '100%', boxSizing: 'border-box', marginTop: '4px' };
const lbl: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#475569' };
const btnPrimary: React.CSSProperties = { padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' };
const btnSmall: React.CSSProperties = { padding: '6px 12px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', textDecoration: 'none', display: 'inline-block' };
const formCard: React.CSSProperties = { background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '16px' };
const resourceCard: React.CSSProperties = { background: '#fff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px' };
const errAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#fee2e2', color: '#dc2626' };
const okAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#f0fdf4', color: '#166534' };