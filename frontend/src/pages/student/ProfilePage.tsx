import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentApi } from '../../api/student';
import { publicApi } from '../../api/admin';
import { drivesApi } from '../../api/drives';
import { changePassword } from '../../api/auth';
import type { Branch, Batch } from '../../types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [prefs, setPrefs] = useState<any>({ driveAlerts: true, deadlineReminders: true });
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Profile form
  const [formData, setFormData] = useState({
    name: '',
    branchId: '',
    batchId: '',
    knowledgeLevel: 'beginner',
    cgpa: '',
    targetRole: '',
    resumeUrl: '',
    universityId: '',
  });

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      studentApi.getMyProfile(),
      publicApi.getBranches().catch(() => [] as Branch[]),
      publicApi.getBatches().catch(() => [] as Batch[]),
      drivesApi.getNotificationPrefs().catch(() => ({ driveAlerts: true, deadlineReminders: true, trainingReminders: true })),
    ])
      .then(([profileData, branchList, batchList, notifPrefs]) => {
        setProfile(profileData);
        setBranches(branchList);
        setBatches(batchList);
        if (notifPrefs) setPrefs(notifPrefs);
        setFormData({
          name: profileData.name || '',
          branchId: profileData.studentProfile?.branch?.id?.toString() || '',
          batchId: profileData.studentProfile?.batch?.id?.toString() || '',
          knowledgeLevel: profileData.studentProfile?.knowledgeLevel || 'beginner',
          cgpa: profileData.studentProfile?.cgpa?.toString() || '',
          targetRole: profileData.studentProfile?.targetRole || '',
          resumeUrl: profileData.studentProfile?.resumeUrl || '',
          universityId: profileData.studentProfile?.universityId || '',
        });
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load profile'))
      .finally(() => setIsLoading(false));
  }, []);

  const togglePref = (key: 'driveAlerts' | 'deadlineReminders' | 'trainingReminders') =>
    setPrefs((p: any) => ({ ...p, [key]: !p[key] }));

  const savePrefs = async () => {
    try {
      await drivesApi.updateNotificationPrefs(prefs);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2500);
    } catch {
      setError('Failed to update notification preferences');
    }
  };

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
      if (formData.universityId) updateData.universityId = formData.universityId.trim().toUpperCase();

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword.length < 8) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsChangingPwd(true);
    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
      }
      setPwdMsg({ type: 'success', text: res.message || 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update password. Check your current password.',
      });
    } finally {
      setIsChangingPwd(false);
    }
  };

  if (isLoading) return <p>Loading profile...</p>;
  if (!profile) return <p>Profile not found.</p>;

  const academicStatus = profile.studentProfile?.academicStatus || 'pending';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px' }}>
      <h1>My Profile</h1>
      {error && <div style={{ ...alert, background: '#fee', color: '#c00' }}>{error}</div>}
      {success && <div style={{ ...alert, background: '#f0fdf4', color: '#166534' }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '24px' }}>
        {/* LBS APJKTU Academic Information */}
        <div style={{ ...card, gridColumn: '1 / -1' }}>
          <h3 style={{ marginTop: 0 }}>LBSCEK & APJKTU Academic Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>KTU Register Number (KTUID)</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                {profile.studentProfile?.ktuid || profile.studentProfile?.universityId || 'Not set'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Entry Type</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                {profile.studentProfile?.entryType || 'REGULAR'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Admission Year</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                {profile.studentProfile?.admissionYear || 'Not set'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Graduating Batch</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                {profile.studentProfile?.graduatingBatch || profile.studentProfile?.batch?.name || 'Not set'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Academic Scheme</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                {profile.studentProfile?.academicScheme || 'APJKTU 2019'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Department</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                {profile.studentProfile?.branch?.name}{profile.studentProfile?.branch?.code ? ` (${profile.studentProfile.branch.code})` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Account & Academic Identity</h3>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>University ID:</strong> {profile.studentProfile?.universityId || 'Not Set'}</p>
          <p>
            <strong>Academic Status:</strong>{' '}
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor:
                  academicStatus === 'verified'
                    ? '#dcfce7'
                    : academicStatus === 'requires_correction'
                    ? '#fee2e2'
                    : '#fef3c7',
                color:
                  academicStatus === 'verified'
                    ? '#166534'
                    : academicStatus === 'requires_correction'
                    ? '#991b1b'
                    : '#92400e',
              }}
            >
              {academicStatus.toUpperCase()}
            </span>
          </p>
          <p><strong>Placement Status:</strong> {profile.studentProfile?.placementStatus || 'not_placed'}</p>
          <p><strong>Knowledge Level:</strong> {profile.studentProfile?.knowledgeLevel}</p>
          {profile.studentProfile?.branch && (
            <p><strong>Branch:</strong> {profile.studentProfile.branch.name}</p>
          )}

          <div style={{ marginTop: '20px' }}>
            <Link
              to="/academic"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              📊 Go to Academic & Results Hub
            </Link>
          </div>
        </div>

        {/* Edit Form */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Edit Profile</h3>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="profile-universityId" style={label}>University ID</label>
                <input
                  id="profile-universityId"
                  type="text"
                  value={formData.universityId}
                  onChange={(e) => setFormData({ ...formData, universityId: e.target.value.toUpperCase() })}
                  disabled={academicStatus === 'verified'}
                  placeholder="e.g. 21CS042"
                  style={{
                    ...input,
                    ...(academicStatus === 'verified' ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}),
                  }}
                />
                {academicStatus === 'verified' && (
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Locked after verification. Request correction in Academic Hub.
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="profile-fullName" style={label}>Full Name</label>
                <input
                  id="profile-fullName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  minLength={2}
                  style={input}
                />
              </div>

              <div>
                <label htmlFor="profile-knowledgeLevel" style={label}>Knowledge Level</label>
                <select
                  id="profile-knowledgeLevel"
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
                <label htmlFor="profile-branch" style={label}>Branch</label>
                <select
                  id="profile-branch"
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  disabled={academicStatus === 'verified'}
                  style={{
                    ...input,
                    ...(academicStatus === 'verified' ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}),
                  }}
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="profile-batch" style={label}>Batch</label>
                <select
                  id="profile-batch"
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  disabled={academicStatus === 'verified'}
                  style={{
                    ...input,
                    ...(academicStatus === 'verified' ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}),
                  }}
                >
                  <option value="">Select batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.graduationYear})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="profile-cgpa" style={label}>Self-Reported CGPA (0-10)</label>
                <input
                  id="profile-cgpa"
                  type="number"
                  value={formData.cgpa}
                  onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                  min={0}
                  max={10}
                  step={0.01}
                  style={input}
                  placeholder="e.g., 8.50"
                />
              </div>

              <div>
                <label htmlFor="profile-targetRole" style={label}>Target Role</label>
                <input
                  id="profile-targetRole"
                  type="text"
                  value={formData.targetRole}
                  onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                  style={input}
                  placeholder="e.g., Full Stack Developer"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="profile-resumeUrl" style={label}>Resume URL</label>
                <input
                  id="profile-resumeUrl"
                  type="url"
                  value={formData.resumeUrl}
                  onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
                  style={input}
                  placeholder="https://drive.google.com/..."
                />
              </div>
            </div>

            <button type="submit" disabled={isSaving} style={{ ...primaryBtn, marginTop: '20px', minHeight: '40px' }}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change Password Card (Challenge 29/30) */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>🔐 Change Password</h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Updating your password terminates all other active sessions across devices.
          </p>

          {pwdMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                marginBottom: '14px',
                backgroundColor: pwdMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: pwdMsg.type === 'success' ? '#166534' : '#b91c1c',
                fontSize: '13px',
              }}
            >
              {pwdMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="currentPassword" style={label}>Current Password</label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isChangingPwd}
                style={input}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="newPassword" style={label}>New Password (min 8 chars)</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isChangingPwd}
                style={input}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" style={label}>Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isChangingPwd}
                style={input}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={isChangingPwd}
              style={{ ...primaryBtn, backgroundColor: '#0f172a', alignSelf: 'flex-start' }}
            >
              {isChangingPwd ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Notification Preferences (Challenge 14) */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>🔔 Notification Preferences</h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Critical updates (cancellations, withdrawals, schedule changes) are always delivered.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.driveAlerts}
              onChange={() => togglePref('driveAlerts')}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>New placement drive alerts</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.deadlineReminders}
              onChange={() => togglePref('deadlineReminders')}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>Registration deadline reminders (48h before)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.trainingReminders ?? true}
              onChange={() => togglePref('trainingReminders')}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>Training session reminders (24h before)</span>
          </label>
          <button type="button" onClick={savePrefs} style={primaryBtn}>
            {prefsSaved ? '✓ Saved' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #ddd',
  fontSize: '14px',
  boxSizing: 'border-box',
  marginTop: '4px',
};
const label: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#475569' };
const primaryBtn: React.CSSProperties = {
  padding: '10px 24px',
  background: '#1a73e8',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
};
const card: React.CSSProperties = {
  background: '#fff',
  padding: '24px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
};
const alert: React.CSSProperties = {
  padding: '12px',
  borderRadius: '6px',
  marginBottom: '16px',
  fontSize: '14px',
};
