import { useEffect, useState } from 'react';
import { studentApi } from '../../api/student';
import { publicApi } from '../../api/admin';
import type { Branch, Batch } from '../../types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    branchId: '',
    batchId: '',
    knowledgeLevel: 'beginner',
    cgpa: '',
    targetRole: '',
    resumeUrl: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

 useEffect(() => {
  Promise.all([
    studentApi.getMyProfile(),
    publicApi.getBranches().catch(() => [] as Branch[]),
    publicApi.getBatches().catch(() => [] as Batch[]),
  ])
    .then(([profileData, branchList, batchList]) => {
        setProfile(profileData);
        setBranches(branchList);
        setBatches(batchList);
        setFormData({
          name: profileData.name || '',
          branchId: profileData.studentProfile?.branch?.id?.toString() || '',
          batchId: profileData.studentProfile?.batch?.id?.toString() || '',
          knowledgeLevel: profileData.studentProfile?.knowledgeLevel || 'beginner',
          cgpa: profileData.studentProfile?.cgpa?.toString() || '',
          targetRole: profileData.studentProfile?.targetRole || '',
          resumeUrl: profileData.studentProfile?.resumeUrl || '',
        });
      })
    .catch((err) => setError(err.response?.data?.error || 'Failed to load profile'))
    .finally(() => setIsLoading(false));
}, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const updateData: any = {
        name: formData.name,
        knowledgeLevel: formData.knowledgeLevel,
        targetRole: formData.targetRole || null,
      };
      if (formData.branchId) updateData.branchId = parseInt(formData.branchId);
      if (formData.batchId) updateData.batchId = parseInt(formData.batchId);
      if (formData.cgpa) updateData.cgpa = parseFloat(formData.cgpa);
      if (formData.resumeUrl) updateData.resumeUrl = formData.resumeUrl;

      await studentApi.updateMyProfile(updateData);
      setSuccess('Profile updated successfully!');
      // Reload profile
      const updated = await studentApi.getMyProfile();
      setProfile(updated);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <p>Loading profile...</p>;
  if (!profile) return <p>Profile not found.</p>;

  return (
    <div>
      <h1>My Profile</h1>
      {error && <div style={{ ...alert, background: '#fee', color: '#c00' }}>{error}</div>}
      {success && <div style={{ ...alert, background: '#f0fdf4', color: '#166534' }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginTop: '24px' }}>
        {/* Info Card */}
        <div style={card}>
          <h3>Account Info</h3>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>Placement Status:</strong> {profile.studentProfile?.placementStatus || 'not_placed'}</p>
          <p><strong>Knowledge Level:</strong> {profile.studentProfile?.knowledgeLevel}</p>
          {profile.studentProfile?.branch && (
            <p><strong>Branch:</strong> {profile.studentProfile.branch.name}</p>
          )}
        </div>

        {/* Edit Form */}
        <div style={card}>
          <h3>Edit Profile</h3>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={label}>Full Name</label>
                <input
                  type="text" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required minLength={2} style={input}
                />
              </div>

              <div>
                <label style={label}>Knowledge Level</label>
                <select
                  value={formData.knowledgeLevel}
                  onChange={(e) => setFormData({ ...formData, knowledgeLevel: e.target.value })}
                  style={input}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label style={label}>Branch</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  style={input}
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={label}>Batch</label>
                <select
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  style={input}
                >
                  <option value="">Select batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.graduationYear})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={label}>CGPA (0-10)</label>
                <input
                  type="number" value={formData.cgpa}
                  onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                  min={0} max={10} step={0.1} style={input} placeholder="e.g., 8.5"
                />
              </div>

              <div>
                <label style={label}>Target Role</label>
                <input
                  type="text" value={formData.targetRole}
                  onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                  style={input} placeholder="e.g., Full Stack Developer"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={label}>Resume URL</label>
                <input
                  type="url" value={formData.resumeUrl}
                  onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
                  style={input} placeholder="https://drive.google.com/..."
                />
              </div>
            </div>

            <button type="submit" disabled={isSaving} style={{ ...primaryBtn, marginTop: '20px' }}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd',
  fontSize: '14px', boxSizing: 'border-box', marginTop: '4px',
};
const label: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#475569' };
const primaryBtn: React.CSSProperties = {
  padding: '10px 24px', background: '#1a73e8', color: '#fff', border: 'none',
  borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
};
const card: React.CSSProperties = {
  background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0',
};
const alert: React.CSSProperties = {
  padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
};