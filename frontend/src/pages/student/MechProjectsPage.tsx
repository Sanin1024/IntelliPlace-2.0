import { useEffect, useState } from 'react';
import { mechTrainingApi } from '../../api/mechanicalTraining';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';

export default function MechProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    mechTrainingApi.getProjects().then(setProjects).finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (projectId: string) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.zip,.step,.stp,.stl,.iges,.igs,.dwg,.dxf,.docx,.pptx';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('notes', 'Project submission');
      
      try {
        await mechTrainingApi.submitProject(projectId, formData);
        addToast('Project submitted successfully!', 'success');
      } catch (err: any) {
        addToast(err.response?.data?.error || 'Submission failed', 'error');
      }
    };
    fileInput.click();
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '16px' }}>Engineering Projects</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
        Practical engineering projects to build your portfolio and demonstrate real-world skills.
      </p>

      {projects.length === 0 ? (
        <EmptyState icon="🔧" title="No Projects Available" description="Engineering projects will appear here." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {projects.map((p) => (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <span className="badge badge-info">{p.domain}</span>
                  <span className={`badge ${p.difficulty === 'beginner' ? 'badge-success' : p.difficulty === 'advanced' ? 'badge-danger' : 'badge-warning'}`}>
                    {p.difficulty}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--color-text)' }}>{p.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                  {p.problemStatement}
                </p>
                {p.skillsInvolved && p.skillsInvolved.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Skills</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {p.skillsInvolved.map((s: string, i: number) => (
                        <span key={i} className="badge badge-info" style={{ fontSize: '10px' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {p.requiredSoftware && p.requiredSoftware.length > 0 && (
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Software</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {p.requiredSoftware.map((s: string, i: number) => (
                        <span key={i} className="badge badge-warning" style={{ fontSize: '10px' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => handleSubmit(p.id)} className="btn btn-primary" style={{ marginTop: '16px', width: '100%' }}>
                📤 Submit Project
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

