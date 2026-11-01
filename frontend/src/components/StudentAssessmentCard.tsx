import { useEffect, useState } from 'react';

import api from '../api/client';

export default function StudentAssessmentCard() {
  const [assessment, setAssessment] = useState<any>(null);

  useEffect(() => {
    api.get('/students/me/assessment').then(r => setAssessment(r.data.data)).catch(() => {});
  }, []);

  if (!assessment || assessment.status === 'completed') return null;

  const deadline = new Date(assessment.deadline).toLocaleDateString();
  const isOverdue = assessment.status === 'overdue';

  return (
    <div style={{
      marginTop: '24px', padding: '20px', borderRadius: '12px',
      border: `1px solid ${isOverdue ? '#fecaca' : '#bfdbfe'}`,
      background: isOverdue ? '#fef2f2' : '#eff6ff',
      color: isOverdue ? '#dc2626' : '#1e40af'
    }}>
      <h3 style={{ margin: '0 0 8px 0' }}>📋 Preliminary Assessment Required</h3>
      {assessment.status === 'pending_scheduling' && (
        <p style={{ margin: 0 }}>Your assessment is being scheduled by the Placement Officer. Deadline: <strong>{deadline}</strong>.</p>
      )}
      {assessment.status === 'scheduled' && assessment.slot && (
        <p style={{ margin: 0 }}>
          Scheduled for: <strong>{new Date(assessment.slot.startTime).toLocaleString()}</strong> at {assessment.slot.location || 'Online'}.
          <br />Please be available 10 mins early.
        </p>
      )}
      {isOverdue && (
        <p style={{ margin: 0, fontWeight: 600 }}>Your assessment deadline has passed. Please contact the Placement Officer immediately.</p>
      )}
    </div>
  );
}