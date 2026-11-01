import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eeeTrainingApi } from '../../api/eeeTraining';
import { mechTrainingApi } from '../../api/mechanicalTraining';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function EEETrainingPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [careerTracks, setCareerTracks] = useState<any[]>([]);
  const [myTracks, setMyTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      eeeTrainingApi.getDashboard(),
      mechTrainingApi.getCareerTracks(),
      mechTrainingApi.getMyCareerTracks(),
    ])
      .then(([d, t, mt]) => {
        setDashboard(d);
        setCareerTracks(t);
        setMyTracks(mt);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleEnroll = async (trackId: string) => {
    try {
      await mechTrainingApi.enrollInTrack(trackId);
      const mt = await mechTrainingApi.getMyCareerTracks();
      setMyTracks(mt);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '8px' }}>EEE Placement Training</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px' }}>
        Power systems, electrical machines, power electronics, renewable energy, and automation preparation.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>{dashboard?.careerTracksEnrolled || 0}</h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Career Tracks</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: 'var(--color-success)' }}>{dashboard?.practicalsCompleted || 0}</h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Practicals</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: 'var(--color-info)' }}>{dashboard?.mockInterviewsCompleted || 0}</h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Mock Interviews</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <Link to="/eee-training/questions" className="card card-hover" style={{ textDecoration: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>⚡</div>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>Question Bank</p>
        </Link>
        <Link to="/eee-training/practicals" className="card card-hover" style={{ textDecoration: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>🔧</div>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>Practicals</p>
        </Link>
        <Link to="/eee-training/companies" className="card card-hover" style={{ textDecoration: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>🏢</div>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>Companies</p>
        </Link>
        <Link to="/mechanical-training/software" className="card card-hover" style={{ textDecoration: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>💻</div>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>Software</p>
        </Link>
      </div>

      <h3 style={{ marginBottom: '16px' }}>Career Tracks</h3>
      {careerTracks.length === 0 ? (
        <EmptyState icon="🎯" title="No Tracks Available" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {careerTracks.map(track => {
            const enrolled = myTracks.some((t: any) => t.careerTrackId === track.id);
            return (
              <div key={track.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>{track.name}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>{track.description}</p>
                </div>
                <button
                  onClick={() => handleEnroll(track.id)}
                  className={`btn ${enrolled ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ marginTop: '12px', fontSize: '13px' }}
                  disabled={enrolled}
                >
                  {enrolled ? '✓ Enrolled' : 'Enroll'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

