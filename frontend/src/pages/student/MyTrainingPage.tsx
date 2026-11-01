import { useEffect, useState } from 'react';
import { trainingApi } from '../../api/training';
import VideoPlayer from '../../components/VideoPlayer';

interface ScheduleData {
  adherenceRate: number;
  assignments: Array<{
    id: string;
    status: 'scheduled' | 'completed' | 'overdue' | 'missed';
    completedAt: string | null;
    dueDate: string | null;
    session: {
      id: string;
      title: string;
      description: string | null;
      scheduledAt: string;
      durationMinutes: number;
      location: string | null;
      meetingLink: string | null;
      learningModule?: { id: string; title: string; level: string } | null;
    };
  }>;
}

export default function MyTrainingPage() {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<{ level: string; recommendations: any[] } | null>(null);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<{ id: string; title: string; url: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sched, mods, recs, comps] = await Promise.all([
        trainingApi.mySchedule(),
        trainingApi.getModules(),
        trainingApi.myRecommendations(),
        trainingApi.myCompetencies(),
      ]);
      setSchedule(sched);
      setModules(mods || []);
      setRecommendations(recs);
      setCompetencies(comps || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load training portal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkComplete = async (assignmentId: string) => {
    try {
      await trainingApi.completeAssignment(assignmentId);
      setActionMsg('Assignment marked as completed.');
      setTimeout(() => setActionMsg(null), 3000);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to complete assignment');
    }
  };

  const handleEnroll = async (moduleId: string) => {
    try {
      await trainingApi.enroll(moduleId);
      setActionMsg('Enrolled successfully! Complete prerequisites and assessments to demonstrate competency.');
      setTimeout(() => setActionMsg(null), 4000);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Could not enroll in module');
    }
  };

  const handleEvaluate = async (moduleId: string) => {
    try {
      const res = await trainingApi.evaluate(moduleId);
      if (res.status === 'completed') {
        setActionMsg(`🎉 Module completed! Best score: ${res.bestScore}%. Competency recorded.`);
      } else {
        setActionMsg(
          `Status: ${res.status}. Best score: ${res.bestScore ?? 'N/A'}%. Passing score needed: ${
            res.minPassingScore ?? 70
          }%.`
        );
      }
      setTimeout(() => setActionMsg(null), 5000);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Competency check failed');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading training & learning portal...</div>;
  }

  const upcomingCount = schedule?.assignments.filter((a) => a.status === 'scheduled').length || 0;
  const overdueCount = schedule?.assignments.filter((a) => a.status === 'overdue').length || 0;
  const missedCount = schedule?.assignments.filter((a) => a.status === 'missed').length || 0;
  const completedCount = schedule?.assignments.filter((a) => a.status === 'completed').length || 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Training & Learning Management</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Track assigned sessions, progress through learning modules, and earn verified competencies.
          </p>
        </div>
        <button
          onClick={loadData}
          type="button"
          style={{
            padding: '8px 16px',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {actionMsg && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '1rem',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            color: '#065f46',
            fontSize: '14px',
          }}
        >
          {actionMsg}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Video Modal / Player Section if active */}
      {activeVideo && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button
              onClick={() => setActiveVideo(null)}
              type="button"
              style={{
                padding: '4px 10px',
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ✕ Close Video
            </button>
          </div>
          <VideoPlayer resourceId={activeVideo.id} videoUrl={activeVideo.url} title={activeVideo.title} />
        </div>
      )}

      {/* Top Grid: Adherence Scoreboard & Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {/* Adherence Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Schedule Adherence
            </span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: (schedule?.adherenceRate ?? 100) >= 80 ? '#16a34a' : (schedule?.adherenceRate ?? 100) >= 60 ? '#d97706' : '#dc2626',
              }}
            >
              {schedule?.adherenceRate ?? 100}%
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
            <div style={statBox}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>{completedCount}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Done</div>
            </div>
            <div style={statBox}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>{upcomingCount}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Upcoming</div>
            </div>
            <div style={statBox}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#d97706' }}>{overdueCount}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Overdue</div>
            </div>
            <div style={statBox}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>{missedCount}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Missed</div>
            </div>
          </div>
          {overdueCount > 0 && (
            <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#b45309' }}>
              ⚠️ You have overdue assignments. Lapsed sessions transition to "missed" after 48 hours.
            </p>
          )}
        </div>

        {/* Assessed Skill Level Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Assessed Knowledge Level
            </span>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                background: '#eff6ff',
                color: '#2563eb',
                textTransform: 'capitalize',
              }}
            >
              {recommendations?.level || 'Beginner'}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>
            Derived from your preliminary diagnostic tests. Materials are curated to target knowledge gaps below 60% accuracy.
          </p>
          <div style={{ fontSize: '12px', color: '#334155' }}>
            <strong>Verified Competencies Earned:</strong> {competencies.length}
          </div>
        </div>
      </div>

      {/* Recommended for You (Challenge 54) */}
      {recommendations && recommendations.recommendations.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>🎯 Recommended Study Materials</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {recommendations.recommendations.map((rec) => (
              <div
                key={rec.resourceId}
                style={{
                  ...cardStyle,
                  borderLeft: rec.locked ? '4px solid #94a3b8' : '4px solid #2563eb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>{rec.title}</h4>
                  <span
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: '#f1f5f9',
                      color: '#475569',
                    }}
                  >
                    {rec.difficulty || 'All'}
                  </span>
                </div>
                <p style={{ margin: '6px 0 10px 0', fontSize: '12px', color: '#64748b' }}>{rec.explanation}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {rec.locked ? (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>🔒 Prerequisite Required</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        window.open(trainingApi.downloadUrl(rec.resourceId), '_blank');
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      View / Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Training Sessions (Challenge 51 & 59) */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>📅 Assigned Training Sessions</h2>
        {(!schedule || schedule.assignments.length === 0) ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
            No sessions currently assigned to your schedule.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {schedule.assignments.map((a) => {
              const sessDate = new Date(a.session.scheduledAt);
              const formattedDate = sessDate.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              let badgeBg = '#f1f5f9';
              let badgeColor = '#475569';
              if (a.status === 'completed') {
                badgeBg = '#ecfdf5';
                badgeColor = '#059669';
              } else if (a.status === 'overdue') {
                badgeBg = '#fffbeb';
                badgeColor = '#d97706';
              } else if (a.status === 'missed') {
                badgeBg = '#fef2f2';
                badgeColor = '#dc2626';
              } else if (a.status === 'scheduled') {
                badgeBg = '#eff6ff';
                badgeColor = '#2563eb';
              }

              return (
                <div
                  key={a.id}
                  style={{
                    ...cardStyle,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: badgeBg,
                          color: badgeColor,
                          textTransform: 'uppercase',
                        }}
                      >
                        {a.status}
                      </span>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{a.session.title}</h4>
                    </div>
                    {a.session.description && (
                      <p style={{ margin: '4px 0', fontSize: '13px', color: '#64748b' }}>{a.session.description}</p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                      <span>🕒 {formattedDate} ({a.session.durationMinutes} mins)</span>
                      {a.session.location && <span>📍 {a.session.location}</span>}
                      {a.session.meetingLink && (
                        <a
                          href={a.session.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'none' }}
                        >
                          🔗 Join Online Meeting
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    {a.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleMarkComplete(a.id)}
                        style={{
                          padding: '8px 16px',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Mark Done
                      </button>
                    )}
                    {a.status === 'completed' && (
                      <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>✓ Completed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Learning Modules & Competency Paths (Challenge 55 & 57) */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>📚 Learning Modules & Pathways</h2>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '14px' }}>
          Sequential modules with strict prerequisite gates. Passing an assessment or coding problem awards a verified competency certificate.
        </p>

        {modules.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
            No learning modules published yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {modules.map((m) => {
              const myProg = m.userProgress;
              const status = myProg?.status || 'not_enrolled';
              const isLocked = m.prerequisites && m.prerequisites.length > 0 && status === 'not_enrolled';

              return (
                <div
                  key={m.id}
                  style={{
                    ...cardStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: m.level === 'beginner' ? '#ecfdf5' : m.level === 'intermediate' ? '#eff6ff' : '#fdf4ff',
                          color: m.level === 'beginner' ? '#047857' : m.level === 'intermediate' ? '#1d4ed8' : '#7e22ce',
                          textTransform: 'uppercase',
                        }}
                      >
                        {m.level}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: status === 'completed' ? '#16a34a' : status === 'in_progress' ? '#2563eb' : '#64748b',
                        }}
                      >
                        {status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600 }}>{m.title}</h3>
                    {m.description && (
                      <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                        {m.description}
                      </p>
                    )}

                    {/* Prerequisites */}
                    {m.prerequisites && m.prerequisites.length > 0 && (
                      <div style={{ marginBottom: '10px', fontSize: '12px', color: '#475569' }}>
                        <strong>Prerequisites:</strong>{' '}
                        {m.prerequisites.map((p: any) => p.prerequisiteModule?.title || 'Required Module').join(', ')}
                      </div>
                    )}

                    {/* Verification Criteria */}
                    <div style={{ marginBottom: '12px', fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                      {m.assessmentTestId && (
                        <div>📝 Assessment required: Min {m.minPassingScore}% passing score</div>
                      )}
                      {m.codingProblemId && <div>💻 Coding task required: Must pass all test cases</div>}
                      {!m.assessmentTestId && !m.codingProblemId && (
                        <div>👨‍🏫 Verified by Trainer evaluation</div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {m.resource && (
                      <button
                        type="button"
                        onClick={() => {
                          const isVideo = m.resource.fileUrl && /\.(mp4|webm|ogg)$/i.test(m.resource.fileUrl);
                          if (isVideo) {
                            setActiveVideo({
                              id: m.resource.id,
                              title: m.resource.title,
                              url: trainingApi.downloadUrl(m.resource.id),
                            });
                          } else {
                            window.open(trainingApi.downloadUrl(m.resource.id), '_blank');
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        📖 Study Material
                      </button>
                    )}

                    {status === 'not_enrolled' ? (
                      <button
                        type="button"
                        onClick={() => handleEnroll(m.id)}
                        style={{
                          padding: '6px 14px',
                          background: isLocked ? '#64748b' : '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {isLocked ? 'Enroll (Prereqs Required)' : 'Enroll Now'}
                      </button>
                    ) : status === 'completed' ? (
                      <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, alignSelf: 'center' }}>
                        ✓ Competency Earned ({myProg?.bestScore || 100}%)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEvaluate(m.id)}
                        style={{
                          padding: '6px 14px',
                          background: '#0891b2',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Check Competency
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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

const statBox: React.CSSProperties = {
  background: '#f8fafc',
  padding: '8px',
  borderRadius: '6px',
};
