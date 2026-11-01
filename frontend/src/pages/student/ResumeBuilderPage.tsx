import { useEffect, useState } from 'react';
import { resumeApi } from '../../api/resume';
import type { ResumeData } from '../../api/resume';
import { useToast } from '../../context/ToastContext';

const EMPTY_DATA: ResumeData = {
  summary: '',
  education: [{ institution: '', degree: '', year: '', score: '' }],
  skills: [],
  projects: [{ title: '', description: '', techStack: '', link: '' }],
  links: [{ label: '', url: '' }],
};

export default function ResumeBuilderPage() {
  const [data, setData] = useState<ResumeData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [error, setError] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    resumeApi.get()
      .then((d) => {
        if (d) {
          setData(d);
          setHasSaved(true);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && skill.length <= 60 && data.skills.length < 30) {
      setData(prev => ({ ...prev, skills: [...prev.skills, skill] }));
      setSkillInput('');
    }
  };

  const removeSkill = (index: number) => {
    setData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
  };

  const addEducation = () => {
    if (data.education && data.education.length < 5) {
      setData(prev => ({
        ...prev,
        education: [...(prev.education || []), { institution: '', degree: '', year: '', score: '' }],
      }));
    }
  };

  const addProject = () => {
    if (data.projects && data.projects.length < 5) {
      setData(prev => ({
        ...prev,
        projects: [...(prev.projects || []), { title: '', description: '', techStack: '', link: '' }],
      }));
    }
  };

  const handleSave = async () => {
    setError('');
    setIsSaving(true);
    try {
      // Filter out empty entries
      const cleaned = {
        summary: data.summary || null,
        education: data.education?.filter(e => e.institution && e.degree) || null,
        skills: data.skills,
        projects: data.projects?.filter(p => p.title) || null,
        links: data.links?.filter(l => l.label && l.url) || null,
      };
      await resumeApi.save(cleaned);
      setHasSaved(true);
      addToast('Resume saved successfully!', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to save resume';
      const details = err.response?.data?.details;
      if (details?.length) {
        setError(`${msg}: ${details.map((d: any) => `${d.field} - ${d.message}`).join('; ')}`);
      } else {
        setError(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!hasSaved) {
      setError('Save your resume first, then download.');
      return;
    }
    const token = localStorage.getItem('token');
    const url = resumeApi.getPdfUrl();
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.pdf';
    // Fetch as blob with auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'resume.pdf';
        link.click();
        URL.revokeObjectURL(blobUrl);
        addToast('Resume PDF downloaded!', 'success');
      })
      .catch(() => setError('Failed to download PDF. Make sure you saved first.'));
  };

  if (isLoading) return <p style={{ padding: '40px', textAlign: 'center' }}>Loading resume builder...</p>;

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>📄 Resume Builder</h1>
      <p style={{ color: '#64748b', fontSize: '14px' }}>
        Build a one-page resume. Your data is saved to your profile.
        {!hasSaved && <span style={{ color: '#d97706' }}> No resume data yet — start below.</span>}
      </p>

      {error && <div style={{ ...alert, background: '#fee2e2', color: '#dc2626' }}>{error}</div>}

      {/* Summary */}
      <section style={section}>
        <h2 style={sectionTitle}>Summary</h2>
        <textarea
          value={data.summary || ''}
          onChange={(e) => setData(prev => ({ ...prev, summary: e.target.value }))}
          placeholder="A brief summary about yourself (max 1000 characters)..."
          maxLength={1000}
          rows={4}
          style={input}
        />
        <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
          {(data.summary || '').length}/1000
        </p>
      </section>

      {/* Education */}
      <section style={section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={sectionTitle}>Education</h2>
          {data.education && data.education.length < 5 && (
            <button type="button" onClick={addEducation} style={addBtn}>+ Add</button>
          )}
        </div>
        {data.education?.map((edu, i) => (
          <div key={i} style={{ ...grid2, marginBottom: '12px' }}>
            <input
              type="text" placeholder="Institution" value={edu.institution}
              onChange={(e) => {
                const updated = [...data.education!];
                updated[i] = { ...updated[i], institution: e.target.value };
                setData(prev => ({ ...prev, education: updated }));
              }}
              style={input} maxLength={120}
            />
            <input
              type="text" placeholder="Degree (e.g., B.Tech CSE)" value={edu.degree}
              onChange={(e) => {
                const updated = [...data.education!];
                updated[i] = { ...updated[i], degree: e.target.value };
                setData(prev => ({ ...prev, education: updated }));
              }}
              style={input} maxLength={100}
            />
            <input
              type="text" placeholder="Year (e.g., 2022-2026)" value={edu.year}
              onChange={(e) => {
                const updated = [...data.education!];
                updated[i] = { ...updated[i], year: e.target.value };
                setData(prev => ({ ...prev, education: updated }));
              }}
              style={input} maxLength={20}
            />
            <input
              type="text" placeholder="Score (e.g., 8.5 CGPA)" value={edu.score || ''}
              onChange={(e) => {
                const updated = [...data.education!];
                updated[i] = { ...updated[i], score: e.target.value };
                setData(prev => ({ ...prev, education: updated }));
              }}
              style={input} maxLength={30}
            />
          </div>
        ))}
      </section>

      {/* Skills */}
      <section style={section}>
        <h2 style={sectionTitle}>Skills ({data.skills.length}/30)</h2>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text" placeholder="Type a skill and press Enter"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
            style={{ ...input, flex: 1 }} maxLength={60}
          />
          <button type="button" onClick={addSkill} style={addBtn}>Add</button>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {data.skills.map((skill, i) => (
            <span key={i} style={skillTag}>
              {skill}
              <button onClick={() => removeSkill(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '4px', color: '#dc2626', fontSize: '14px' }}>×</button>
            </span>
          ))}
          {data.skills.length === 0 && <p style={{ fontSize: '13px', color: '#94a3b8' }}>No skills added yet.</p>}
        </div>
      </section>

      {/* Projects */}
      <section style={section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={sectionTitle}>Projects ({data.projects?.length || 0}/5)</h2>
          {data.projects && data.projects.length < 5 && (
            <button type="button" onClick={addProject} style={addBtn}>+ Add</button>
          )}
        </div>
        {data.projects?.map((proj, i) => (
          <div key={i} style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
            <input
              type="text" placeholder="Project title" value={proj.title}
              onChange={(e) => {
                const updated = [...data.projects!];
                updated[i] = { ...updated[i], title: e.target.value };
                setData(prev => ({ ...prev, projects: updated }));
              }}
              style={{ ...input, marginBottom: '8px' }} maxLength={100}
            />
            <textarea
              placeholder="Description (max 500 characters)" value={proj.description}
              onChange={(e) => {
                const updated = [...data.projects!];
                updated[i] = { ...updated[i], description: e.target.value };
                setData(prev => ({ ...prev, projects: updated }));
              }}
              rows={2} style={{ ...input, marginBottom: '8px' }} maxLength={500}
            />
            <div style={grid2}>
              <input
                type="text" placeholder="Tech stack (e.g., React, Node.js)" value={proj.techStack || ''}
                onChange={(e) => {
                  const updated = [...data.projects!];
                  updated[i] = { ...updated[i], techStack: e.target.value };
                  setData(prev => ({ ...prev, projects: updated }));
                }}
                style={input} maxLength={200}
              />
              <input
                type="url" placeholder="Link (optional)" value={proj.link || ''}
                onChange={(e) => {
                  const updated = [...data.projects!];
                  updated[i] = { ...updated[i], link: e.target.value };
                  setData(prev => ({ ...prev, projects: updated }));
                }}
                style={input} maxLength={300}
              />
            </div>
          </div>
        ))}
      </section>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
        <button onClick={handleSave} disabled={isSaving} style={primaryBtn}>
          {isSaving ? 'Saving...' : '💾 Save Resume'}
        </button>
        <button onClick={handleDownload} style={secondaryBtn}>
          📄 Download PDF
        </button>
      </div>
    </div>
  );
}

const section: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '16px' };
const sectionTitle: React.CSSProperties = { margin: '0 0 12px 0', fontSize: '15px' };
const input: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' };
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px' };
const addBtn: React.CSSProperties = { padding: '6px 14px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 };
const primaryBtn: React.CSSProperties = { padding: '12px 28px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600 };
const secondaryBtn: React.CSSProperties = { padding: '12px 28px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600 };
const skillTag: React.CSSProperties = { background: '#e0e7ff', color: '#4338ca', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', display: 'inline-flex', alignItems: 'center' };
const alert: React.CSSProperties = { padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' };