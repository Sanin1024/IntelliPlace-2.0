import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { forgotPassword } from '../../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setDevResetToken(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPassword(trimmed);
      setSuccessMessage(res.message);
      if (res.resetToken) {
        setDevResetToken(res.resetToken);
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error || 'Failed to submit password reset request. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <Mail size={24} color="#4f46e5" />
          </div>
          <h1 style={styles.title}>Forgot Password</h1>
          <p style={styles.subtitle}>
            Enter your university registered email to receive password reset instructions.
          </p>
        </div>

        {errorMessage && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage ? (
          <div style={styles.successBox}>
            <CheckCircle2 size={24} color="#16a34a" />
            <div>
              <p style={{ fontWeight: 600, color: '#15803d', margin: 0 }}>Reset Request Processed</p>
              <p style={{ fontSize: '13px', color: '#166534', marginTop: '4px' }}>
                {successMessage}
              </p>
              {devResetToken && (
                <div style={styles.devBox}>
                  <p style={{ margin: 0, fontWeight: 600 }}>Development Mode Token:</p>
                  <code style={{ wordBreak: 'break-all', fontSize: '12px' }}>{devResetToken}</code>
                  <div style={{ marginTop: '8px' }}>
                    <Link
                      to={`/reset-password?token=${devResetToken}`}
                      style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Click here to reset your password directly
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label htmlFor="email" style={styles.label}>
                Registered Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                required
                disabled={isLoading}
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={isLoading} style={styles.button}>
              {isLoading ? 'Submitting...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <Link to="/login" style={styles.backLink}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: '#f8fafc',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
    padding: '36px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  iconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '8px',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#334155',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  button: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  successBox: {
    display: 'flex',
    gap: '12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  devBox: {
    marginTop: '12px',
    padding: '10px',
    backgroundColor: '#ffffff',
    border: '1px dashed #4f46e5',
    borderRadius: '6px',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#64748b',
    fontSize: '14px',
    textDecoration: 'none',
    fontWeight: 500,
  },
};

