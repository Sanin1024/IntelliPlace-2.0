import { useEffect, useState } from 'react';
import { companyApi } from '../../api/company';
import { publicApi } from '../../api/admin';
import type { Company } from '../../api/company';

export default function PublishDrivePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    jobRole: '',
    package: '',
    eligibilityCgpa: '7',
    driveDate: '',
    syllabusText: '',
    eligibleBranchIds: [] as number[],
    topicIds: [] as number[],
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      setCompanies(await companyApi.getAll());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load companies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    publicApi.getBranches().then(setBranches).catch(() => setBranches([]));
    publicApi.getTopics().then(setTopics).catch(() => setTopics([]));
    load();
  }, []);

  const toggleBranch = (branchId: number) => {
    setForm(prev => ({
      ...prev,
      eligibleBranchIds: prev.eligibleBranchIds.includes(branchId)
        ? prev.eligibleBranchIds.filter(id => id !== branchId)
        : [...prev.eligibleBranchIds, branchId],
    }));
  };

  const toggleTopic = (topicId: number) => {
    setForm(prev => ({
      ...prev,
      topicIds: prev.topicIds.includes(topicId)
        ? prev.topicIds.filter(id => id !== topicId)
        : [...prev.topicIds, topicId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.eligibleBranchIds.length === 0) {
      setError('Select at least one eligible branch');
      return;
    }

    try {
      await companyApi.create({
        name: form.name,
        description: form.description || undefined,
        jobRole: form.jobRole,
        package: form.package ? parseFloat(form.package) : undefined,
        eligibilityCgpa: parseFloat(form.eligibilityCgpa),
        driveDate: new Date(form.driveDate).toISOString(),
        syllabusText: form.syllabusText || undefined,
        eligibleBranchIds: form.eligibleBranchIds,
        topicIds: form.topicIds,
      });
      setSuccess(`Company "${form.name}" published successfully!`);
      setForm({
        name: '', description: '', jobRole: '', package: '',
        eligibilityCgpa: '7', driveDate: '', syllabusText: '',
        eligibleBranchIds: [], topicIds: [],
      });
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to publish company');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this company?')) return;
    try {
      await companyApi.delete(id);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Placement Drives</h1>
        <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>
          {showForm ? 'Close Form' : '+ Publish New Drive'}
        </button>
      </div>

      {error && <div style={errAlert}>{error}</div>}
      {success && <div style={okAlert}>{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={card}>
          <h3>New Company Drive</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={lbl}>Company Name</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required minLength={2} style={inp} placeholder="e.g., Infosys" />
            </div>
            <div>
              <label style={lbl}>Job Role</label>
              <input type="text" value={form.jobRole} onChange={e => setForm({...form, jobRole: e.target.value})} required style={inp} placeholder="e.g., Systems Engineer" />
            </div>
            <div>
              <label style={lbl}>Package (LPA)</label>
              <input type="number" value={form.package} onChange={e => setForm({...form, package: e.target.value})} min={0} step={0.5} style={inp} placeholder="e.g., 3.5" />
            </div>
            <div>
              <label style={lbl}>Minimum CGPA</label>
              <input type="number" value={form.eligibilityCgpa} onChange={e => setForm({...form, eligibilityCgpa: e.target.value})} min={0} max={10} step={0.1} required style={inp} />
            </div>
            <div>
              <label style={lbl}>Drive Date</label>
              <input type="date" value={form.driveDate} onChange={e => setForm({...form, driveDate: e.target.value})} required min={new Date().toISOString().split('T')[0]} style={inp} />
            </div>
            <div>
              <label style={lbl}>Description (optional)</label>
              <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={inp} placeholder="About the company" />
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={lbl}>Eligible Branches (click to toggle)</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {branches.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBranch(b.id)}
                  style={{
                    ...chipBtn,
                    ...(form.eligibleBranchIds.includes(b.id) ? chipActive : {}),
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={lbl}>Topics to Prepare (optional — for prep recommendations)</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {topics.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTopic(t.id)}
                  style={{
                    ...chipBtn,
                    ...(form.topicIds.includes(t.id) ? chipActive : {}),
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={lbl}>Syllabus / Selection Pattern (optional)</label>
            <textarea
              value={form.syllabusText}
              onChange={e => setForm({...form, syllabusText: e.target.value})}
              rows={4}
              style={inp}
              placeholder={'Round 1: Online Aptitude Test (60 mins)&#10;Round 2: Technical Interview&#10;Round 3: HR Interview'}
            />
          </div>

          <button type="submit" style={{ ...btnPrimary, marginTop: '20px' }}>Publish Drive</button>
        </form>
      )}

      {/* Company List */}
      <div style={{ marginTop: '24px' }}>
        {companies.map(c => (
          <div key={c.id} style={companyCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0' }}>
                  {c.name}
                  {c.package && <span style={pkgBadge}>₹{c.package} LPA</span>}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  {c.jobRole} • CGPA {c.eligibilityCgpa}+ •
                  Drive: {c.driveDate ? new Date(c.driveDate).toLocaleDateString() : 'TBD'}
                  {c.daysUntilDrive !== null && c.daysUntilDrive >= 0 && ` (${c.daysUntilDrive}d)`}
                </p>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Branches: {c.eligibleBranches?.map((b: any) => b.name || b.branch?.name).join(', ')} •
                  ⭐ {c.targetCount ?? c._count?.targetStudents ?? 0} interested
                </p>
              </div>
              <button onClick={() => handleDelete(c.id)} style={{...btnSmall, background: '#fee2e2', color: '#dc2626'}}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {companies.length === 0 && (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
            No companies published yet.
          </p>
        )}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', width: '100%', boxSizing: 'border-box', marginTop: '4px' };
const lbl: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#475569' };
const btnPrimary: React.CSSProperties = { padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' };
const btnSmall: React.CSSProperties = { padding: '6px 12px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const card: React.CSSProperties = { background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' };
const companyCard: React.CSSProperties = { background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px' };
const chipBtn: React.CSSProperties = { padding: '6px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: 600 };
const chipActive: React.CSSProperties = { background: '#1a73e8', color: '#fff', borderColor: '#1a73e8' };
const pkgBadge: React.CSSProperties = { background: '#f0fdf4', color: '#16a34a', padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, marginLeft: '8px' };
const errAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#fee2e2', color: '#dc2626' };
const okAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#f0fdf4', color: '#166534' };