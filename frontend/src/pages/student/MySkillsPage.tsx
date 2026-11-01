import { useEffect, useState } from 'react';
import { recoApi } from '../../api/reco';
import { useToast } from '../../context/ToastContext';

const LEVEL_COLORS: Record<string, string> = {
  beginner: '#16a34a', intermediate: '#d97706', advanced: '#dc2626',
};
const CONF_COLORS: Record<string, string> = {
  insufficient: '#94a3b8', low: '#d97706', moderate: '#1a73e8', high: '#16a34a',
};

export default function MySkillsPage() {
  const [skills, setSkills] = useState<any>(null);
  const [newSkill, setNewSkill] = useState('');
  const [newLevel, setNewLevel] = useState('beginner');
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  const load = () => recoApi.mySkills()
    .then(setSkills)
    .catch(() => addToast('Failed to load skills', 'error'))
    .finally(() => setIsLoading(false));

  useEffect(() => { load(); }, []);

  const addSkill = async () => {
    const skill = newSkill.trim();
    if (skill.length < 2) { addToast('Skill name too short', 'error'); return; }
    try {
      await recoApi.saveDeclaredSkills([{ skill, declaredLevel: newLevel }]);
      setNewSkill('');
      addToast(`"${skill}" declared — provisional until assessments verify it`, 'success');
      load();
    } catch (e: any) { addToast(e.response?.data?.error || 'Failed to save', 'error'); }
  };

  const changeLevel = async (skill: string, declaredLevel: string) => {
    try {
      await recoApi.saveDeclaredSkills([{ skill, declaredLevel }]);
      load();
    } catch { addToast('Failed', 'error'); }
  };

  const removeSkill = async (skill: string) => {
    try {
      await recoApi.deleteDeclaredSkill(skill);
      addToast('Skill removed', 'success');
      load();
    } catch { addToast('Failed to remove', 'error'); }
  };

  if (isLoading) return <p>Loading skills…</p>;
  if (!skills) return null;

  return (
    <div>
      <h1>My Skills</h1>
      <p style={{ color: '#64748b', fontSize: '14px' }}>
        Declared proficiency is <strong>provisional</strong> — assessments and completed modules verify your actual level.
      </p>

      {/* Declared */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>🗣️ Declared Skills ({skills.declared.length})</h3>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
            placeholder="e.g., Java, SQL, React…" maxLength={60}
            style={{ ...inp, flex: 1, minWidth: '180px' }} />
          <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)} style={{ ...inp, width: 'auto' }}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <button onClick={addSkill} style={btnP}>+ Declare</button>
        </div>

        {skills.declared.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            No skills declared yet. Declaring skills helps personalize your recommendations.
          </p>
        )}

        {skills.declared.map((d: any) => (
          <div key={d.skill} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <strong style={{ textTransform: 'capitalize' }}>{d.skill}</strong>
                <span style={{ marginLeft: '8px', ...lvlBadge, color: LEVEL_COLORS[d.declaredLevel], background: `${LEVEL_COLORS[d.declaredLevel]}15` }}>
                  declared: {d.declaredLevel}
                </span>
                {d.verifiedLevel ? (
                  <span style={{ marginLeft: '6px', ...lvlBadge, color: LEVEL_COLORS[d.verifiedLevel], background: `${LEVEL_COLORS[d.verifiedLevel]}15` }}>
                    ✓ verified: {d.verifiedLevel}
                  </span>
                ) : (
                  <span style={{ marginLeft: '6px', ...lvlBadge, color: '#94a3b8', background: '#f8fafc' }}>unverified</span>
                )}
                <span style={{ marginLeft: '6px', fontSize: '11px', color: CONF_COLORS[d.confidence] }}>
                  {d.confidence} confidence · {d.evidenceCount} answers
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select value={d.declaredLevel} onChange={(e) => changeLevel(d.skill, e.target.value)}
                  style={{ ...inp, width: 'auto', padding: '4px 8px', fontSize: '12px' }}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <button onClick={() => removeSkill(d.skill)} style={btnX}>×</button>
              </div>
            </div>
            {d.feedback && (
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#92400e', background: '#fffbeb', padding: '8px 10px', borderRadius: '6px' }}>
                💡 {d.feedback}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Verified evidence */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>📊 Verified Performance ({skills.evidence.length})</h3>
        {skills.evidence.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            No assessment evidence yet — take a practice session or mock test to generate verified skill data.
          </p>
        ) : skills.evidence.map((e: any) => (
          <div key={e.skill} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <strong style={{ textTransform: 'capitalize' }}>{e.skill}</strong>
              <span style={{ marginLeft: '8px', fontSize: '11px', color: '#94a3b8' }}>{e.source.replace(/_/g, ' ')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {e.accuracy != null ? (
                <>
                  <div style={{ width: '100px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${e.accuracy}%`, background: e.accuracy >= 80 ? '#16a34a' : e.accuracy >= 60 ? '#d97706' : '#dc2626' }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, width: '38px' }}>{e.accuracy}%</span>
                </>
              ) : <span style={{ fontSize: '12px', color: '#94a3b8' }}>no score</span>}
              <span style={{ fontSize: '11px', color: CONF_COLORS[e.confidence] }}>{e.confidence}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '16px' };
const inp: React.CSSProperties = { padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' };
const btnP: React.CSSProperties = { padding: '8px 16px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 };
const btnX: React.CSSProperties = { padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 };
const lvlBadge: React.CSSProperties = { padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 };

