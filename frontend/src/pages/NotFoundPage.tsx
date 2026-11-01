import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '60px', minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <h1 style={{ fontSize: '72px', margin: 0, color: '#1a73e8' }}>404</h1>
      <h2>Page Not Found</h2>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>The page you are looking for doesn't exist or has been moved.</p>
      <Link to="/dashboard" style={{ padding: '10px 24px', background: '#1a73e8', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>
        Back to Dashboard
      </Link>
    </div>
  );
}