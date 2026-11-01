import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { prepPlanApi } from '../api/prepPlan';
import type { PrepPlan } from '../api/prepPlan';

interface Props {
  companyId: string;
}

export default function PrepPlanSection({ companyId }: Props) {
  const [plan, setPlan] = useState<PrepPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    prepPlanApi.get(companyId)
      .then(setPlan)
      .catch(err => setError(err.response?.data?.error || 'Failed to load prep plan'))
      .finally(() => setIsLoading(false));
  }, [companyId]);

  if (isLoading) return <p style={{ color: '#64748b', padding: '16px' }}>Loading prep plan...</p>;
  if (error) return <div style={{ ...errStyle, padding: '12px' }}>{error}</div>;
  if (!plan) return null;

  if (plan.topics.length === 0) {
    return (
      <div style={emptyState}>
        <p style={{ fontSize: '32px', margin: 0 }}>🎯</p>
        <p style={{ color: '#64748b' }}>{plan.message || 'No prep topics linked to this company yet.'}</p>
      </div>
    );
  }

  const noDataCount = plan.topics.filter(t => t.status === 'not_enough_data').length;

  return (
    <div style={{ marginTop: '24px' }}>
      <h3 style={{ margin: '0 0 8px 0' }}>🎯 Prep Plan</h3>
      {plan.gapCount > 0 && (
        <p style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, margin: '0 0 16px 0' }}>
          ⚠️ You have gaps in {plan.gapCount} of {plan.totalTopics} topics
        </p>
      )}
      {plan.gapCount === 0 && noDataCount === 0 && (
        <p style={{ color: '#16a34a', fontSize: '13px', fontWeight: 600, margin: '0 0 16px 0' }}>
          ✅ You're strong in all topics for this company!
        </p>
      )}

      {plan.topics.map(topic => (
        <div key={topic.topicId} style={topicCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{topic.topicName}</p>
              {topic.status === 'not_enough_data' ? (
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  {topic.message}
                </p>
              ) : (
                <>
                  {/* Gap Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${topic.accuracy}%`,
                        background: topic.hasGap ? '#dc2626' : '#16a34a',
                        borderRadius: '4px',
                      }} />
                    </div>
                    <span style={{
                      fontSize: '13px', fontWeight: 700,
                      color: topic.hasGap ? '#dc2626' : '#16a34a',
                    }}>
                      {topic.accuracy}%
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                    {topic.correct}/{topic.totalAnswered} correct
                  </p>
                </>
              )}
            </div>
            <span style={statusBadge(topic)}>
              {topic.status === 'gap' ? 'Gap' : topic.status === 'strong' ? 'Strong' : 'No Data'}
            </span>
          </div>

          {/* Actions */}
          {topic.actions.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {topic.actions.map((action, i) => (
                <Link key={i} to={action.link} style={actionBtn}>
                  {action.label} →
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}

      {noDataCount === plan.totalTopics && (
        <div style={emptyState}>
          <p style={{ fontSize: '28px', margin: 0 }}>📊</p>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Take a practice session or mock test to see your accuracy per topic here.
          </p>
        </div>
      )}
    </div>
  );
}

function statusBadge(topic: any): React.CSSProperties {
  if (topic.status === 'gap') return { background: '#fef2f2', color: '#dc2626', padding: '4px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 };
  if (topic.status === 'strong') return { background: '#f0fdf4', color: '#16a34a', padding: '4px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 };
  return { background: '#f8fafc', color: '#94a3b8', padding: '4px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 };
}

const topicCard: React.CSSProperties = { background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px' };
const actionBtn: React.CSSProperties = { padding: '6px 14px', background: '#eff6ff', color: '#1a73e8', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 };
const emptyState: React.CSSProperties = { textAlign: 'center', padding: '32px', background: '#f8fafc', borderRadius: '10px' };
const errStyle: React.CSSProperties = { background: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '14px' };