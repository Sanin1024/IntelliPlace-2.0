import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [knowledgeLevel, setKnowledgeLevel] = useState('beginner');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await register(name, email, password, knowledgeLevel);
      navigate('/dashboard');
    } catch (err: any) {
      const apiError = err.response?.data?.error || 'Registration failed';
      const details = err.response?.data?.details;
      if (details?.length) {
        setError(`${apiError}: ${details.map((d: any) => d.message).join(', ')}`);
      } else {
        setError(apiError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.subtitle}>Join IntelliPlace as a student</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              required minLength={2} placeholder="John Doe" style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required placeholder="you@example.com" style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password">Password (min 8 characters)</label>
            <input
              id="password"
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8} placeholder="••••••••" style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              required minLength={8} placeholder="••••••••" style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="knowledgeLevel">Knowledge Level</label>
            <select
              id="knowledgeLevel"
              value={knowledgeLevel}
              onChange={(e) => setKnowledgeLevel(e.target.value)}
              style={styles.input}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <button type="submit" disabled={isLoading} style={styles.button}>
            {isLoading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={styles.link}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

// Reuse same styles as LoginPage
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh', background: '#f0f2f5',
  },
  card: {
    background: '#fff', padding: '40px', borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '420px',
  },
  title: { textAlign: 'center', margin: 0, color: '#1a73e8', fontSize: '28px' },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: '24px' },
  error: {
    background: '#fee', color: '#c00', padding: '10px', borderRadius: '6px',
    marginBottom: '16px', fontSize: '14px',
  },
  field: { marginBottom: '16px' },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: '6px',
    border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', marginTop: '4px',
  },
  button: {
    width: '100%', padding: '12px', background: '#1a73e8', color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', marginTop: '8px',
  },
  link: { textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#666' },
};