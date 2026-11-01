import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../theme/ThemeToggle';

export default function RegisterPage() {
  const { user, register, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ktuid, setKtuid] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

  // If already logged in, redirect directly to dashboard
  useEffect(() => {
    if (!isAuthLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isAuthLoading, navigate]);

  // Handle active countdown timer when rate-limited
  useEffect(() => {
    if (retryCountdown <= 0) return;
    const timer = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCountdown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Guard against duplicate submission while in flight or rate-limited
    if (isLoading || retryCountdown > 0) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Full name must be at least 2 characters');
      return;
    }
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

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
      await register(
        trimmedName,
        trimmedEmail,
        password,
        undefined,
        undefined,
        undefined,
        undefined,
        ktuid.trim() || undefined
      );
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      const apiError =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please try again.';
      const details = err.response?.data?.details;

      if (details?.length) {
        setError(`${apiError}: ${details.map((d: any) => d.message).join(', ')}`);
      } else {
        setError(apiError);
      }

      if (status === 429) {
        const retryHeader = err.response?.headers?.['retry-after'];
        const retryBody = err.response?.data?.retryAfter;
        const seconds = Number.parseInt(String(retryHeader || retryBody), 10) || 60;
        setRetryCountdown(seconds);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = isLoading || retryCountdown > 0;

  return (
    <div style={styles.container}>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <ThemeToggle />
      </div>
      <div style={styles.card}>
        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.subtitle}>Join IntelliPlace as a student</p>

        {error && (
          <div style={styles.error} role="alert">
            <div>{error}</div>
            {retryCountdown > 0 && (
              <div style={{ marginTop: '6px', fontWeight: 600 }}>
                Please wait {retryCountdown} second{retryCountdown === 1 ? '' : 's'} before retrying.
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              disabled={isLoading}
              placeholder="John Doe"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="you@example.com"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="ktuid">KTU Register Number (KTUID)</label>
            <input
              id="ktuid"
              type="text"
              value={ktuid}
              onChange={(e) => setKtuid(e.target.value.toUpperCase())}
              disabled={isLoading}
              placeholder="e.g. KSD23CS007 or LKSD23CS134"
              style={styles.input}
              pattern="[LK]?KSD\d{2}(CSBS|CAID|CS|ME|CE|EC|EE|IT)\d{3,4}"
              title="Format: KSDYYDEPT### (e.g., KSD23CS007) or LKSDYYDEPT### for lateral entry"
            />
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              LBS College of Engineering Kasaragod | APJKTU 2019 Scheme
            </p>
          </div>

          <div style={styles.field}>
            <label htmlFor="password">Password (min 8 characters)</label>
            <div style={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
                placeholder="••••••••"
                style={styles.passwordInput}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.toggleButton}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={styles.field}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div style={styles.passwordWrapper}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
                placeholder="••••••••"
                style={styles.passwordInput}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.toggleButton}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            style={{
              ...styles.button,
              ...(isSubmitDisabled ? styles.buttonDisabled : {}),
            }}
          >
            {isLoading
              ? 'Creating account...'
              : retryCountdown > 0
              ? `Retry in ${retryCountdown}s`
              : 'Register'}
          </button>
        </form>

        <p style={styles.link}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: '40px',
              padding: '0 8px',
            }}
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'var(--color-bg)',
    position: 'relative',
    padding: '16px',
  },
  card: {
    background: 'var(--color-surface)',
    padding: '40px',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--color-border)',
    width: '100%',
    maxWidth: '420px',
  },
  title: { textAlign: 'center', margin: 0, color: 'var(--color-primary)', fontSize: '28px' },
  subtitle: { textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '24px' },
  error: {
    background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    marginBottom: '16px',
    fontSize: '14px',
    lineHeight: 1.4,
  },
  field: { marginBottom: '16px' },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: '14px',
    boxSizing: 'border-box',
    marginTop: '4px',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginTop: '4px',
  },
  passwordInput: {
    width: '100%',
    padding: '10px 42px 10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  toggleButton: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: '4px',
  },
  button: {
    width: '100%',
    padding: '12px',
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background-color 0.2s ease, transform 0.15s ease',
  },
  buttonDisabled: {
    background: 'var(--color-border)',
    color: 'var(--color-text-muted)',
    cursor: 'not-allowed',
    opacity: 0.8,
  },
  link: { textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--color-text-muted)' },
};