import { useEffect, useState } from 'react';
import { recoApi } from '../../api/reco';
import { trainingApi } from '../../api/training';
import { useToast } from '../../context/ToastContext';

interface RecoItem {
  id: string;
  resourceId: string;
  resource: {
    id: string;
    title: string;
    description: string | null;
    difficulty: string;
    topic: string;
    fileUrl: string;
  };
  priority: 'high' | 'medium' | 'low';
  reason: {
    headline: string;
    details?: string;
    topic?: string;
    difficulty?: string;
  };
  generatedAt: string;
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecoItem[]>([]);
  const [careerInfo, setCareerInfo] = useState<{ role: string | null; availableRoles: string[] } | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('software_engineer');
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [recoRes, careerRes] = await Promise.all([
        recoApi.recommendations(),
        recoApi.careerGoal().catch(() => null),
      ]);
      setRecommendations(recoRes.recommendations || []);
      if (careerRes) {
        setCareerInfo(careerRes);
        if (careerRes.role) setSelectedRole(careerRes.role);
      }
    } catch {
      addToast('Failed to load personalized recommendations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateCareerGoal = async (newRole: string) => {
    setSelectedRole(newRole);
    try {
      await recoApi.setCareerGoal(newRole);
      addToast('Career goal updated — recommendations refreshed', 'success');
      loadData();
    } catch {
      addToast('Failed to update career goal', 'error');
    }
  };

  const handleDismiss = async (resourceId: string) => {
    try {
      await recoApi.dismissRecommendation(resourceId);
      addToast('Recommendation dismissed', 'success');
      setRecommendations((prev) => prev.filter((r) => r.resourceId !== resourceId));
    } catch {
      addToast('Failed to dismiss', 'error');
    }
  };

  const handleRegenerate = async () => {
    try {
      await recoApi.regenerateRecommendations();
      addToast('Recommendations recalculated based on latest performance and drives', 'success');
      loadData();
    } catch {
      addToast('Failed to regenerate', 'error');
    }
  };

  if (isLoading) return <p style={{ padding: '24px' }}>Loading recommendations…</p>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Personalized For You</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Adaptive study recommendations targeted at your diagnosed knowledge gaps and upcoming placement drive requirements.
          </p>
        </div>
        <button onClick={handleRegenerate} style={btnSecondary}>
          🔄 Recalculate
        </button>
      </div>

      {/* Target Career Goal Selector (Ch 72) */}
      <div style={careerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>🎯 Target Career Milestone</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Materials and skill priority will automatically adjust to this job profile.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={selectedRole}
              onChange={(e) => handleUpdateCareerGoal(e.target.value)}
              style={selectStyle}
            >
              {(careerInfo?.availableRoles || ['software_engineer', 'data_analyst', 'devops_engineer', 'qa_engineer']).map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Recommendations List (Ch 68, 70, 71, 77) */}
      {recommendations.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
          <p style={{ fontSize: '40px', margin: 0 }}>🎉</p>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#334155', marginTop: '8px' }}>You're all caught up!</p>
          <p style={{ fontSize: '13px', margin: 0 }}>
            No pending high-priority gaps detected. Click "Recalculate" anytime to refresh.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recommendations.map((r) => {
            const isHigh = r.priority === 'high';
            const isMedium = r.priority === 'medium';
            const badgeBg = isHigh ? '#fee2e2' : isMedium ? '#fef3c7' : '#f1f5f9';
            const badgeColor = isHigh ? '#dc2626' : isMedium ? '#d97706' : '#64748b';

            return (
              <div
                key={r.id}
                style={{
                  ...cardStyle,
                  borderLeft: isHigh ? '4px solid #dc2626' : isMedium ? '4px solid #d97706' : '4px solid #94a3b8',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: badgeBg,
                          color: badgeColor,
                          textTransform: 'uppercase',
                        }}
                      >
                        {r.priority} Priority
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#f8fafc',
                          color: '#64748b',
                          fontSize: '11px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {r.resource.topic} · {r.resource.difficulty}
                      </span>
                    </div>

                    <h3 style={{ margin: '6px 0 4px 0', fontSize: '16px', fontWeight: 600 }}>{r.resource.title}</h3>
                    {r.resource.description && (
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>{r.resource.description}</p>
                    )}

                    {/* Explainability Block (Challenge 70 / 77) */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        marginTop: '8px',
                      }}
                    >
                      <strong style={{ color: '#0f172a' }}>💡 Why this is recommended:</strong>{' '}
                      <span style={{ color: '#334155' }}>{r.reason.headline}</span>
                      {r.reason.details && (
                        <div style={{ color: '#64748b', marginTop: '2px' }}>{r.reason.details}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => window.open(trainingApi.downloadUrl(r.resourceId), '_blank')}
                      style={btnPrimary}
                    >
                      Study Material →
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(r.resourceId)}
                      title="Dismiss this recommendation"
                      style={btnDismiss}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  padding: '16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const careerCard: React.CSSProperties = {
  background: '#f8fafc',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  padding: '14px 18px',
  marginBottom: '20px',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  fontSize: '13px',
  fontWeight: 600,
  color: '#334155',
};

const btnPrimary: React.CSSProperties = {
  padding: '6px 14px',
  background: '#1a73e8',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
};

const btnSecondary: React.CSSProperties = {
  padding: '6px 14px',
  background: '#f1f5f9',
  color: '#475569',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
};

const btnDismiss: React.CSSProperties = {
  padding: '6px 10px',
  background: '#fee2e2',
  color: '#dc2626',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '12px',
};

