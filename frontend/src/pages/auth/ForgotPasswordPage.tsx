import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { forgotPassword } from '../../api/auth';
import ThemeToggle from '../../theme/ThemeToggle';

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'var(--bg)',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
        <ThemeToggle />
      </div>

      <div
        className="card fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-dropdown)',
          padding: '40px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--accent)',
            }}
          >
            <Mail size={22} />
          </div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Forgot Password
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Enter your registered university email to receive password reset instructions.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="alert alert-error"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '16px' }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage ? (
          <div>
            <div
              className="alert alert-success"
              style={{ display: 'flex', gap: '12px', padding: '16px', marginBottom: '16px' }}
            >
              <CheckCircle2 size={20} style={{ color: 'var(--success-text)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--success-text)', margin: 0 }}>
                  Request Received
                </p>
                <p style={{ fontSize: '13px', color: 'var(--success-text)', marginTop: '4px', lineHeight: 1.4, opacity: 0.9 }}>
                  {successMessage}
                </p>
              </div>
            </div>

            {devResetToken && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: 'var(--surface-muted)',
                  border: '1px dashed var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-text)', margin: '0 0 4px' }}>
                  DEV ONLY — DIRECT RESET LINK:
                </p>
                <Link
                  to={`/reset-password?token=${devResetToken}`}
                  style={{ fontSize: '12px', color: 'var(--accent-text)', wordBreak: 'break-all' }}
                >
                  Click here to set new password
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label
                htmlFor="email"
                style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}
              >
                Registered Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {isLoading ? 'Submitting...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
