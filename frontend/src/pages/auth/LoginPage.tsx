import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../theme/ThemeToggle';

export default function LoginPage() {
  const { user, login, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

  // If already logged in, redirect directly to dashboard
  useEffect(() => {
    if (!isAuthLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isAuthLoading, navigate]);

  useEffect(() => {
    const reason = sessionStorage.getItem('auth_redirect_reason');
    if (reason) {
      setNotice(reason);
      sessionStorage.removeItem('auth_redirect_reason');
    }
  }, []);

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

    if (isLoading || retryCountdown > 0) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setError('');
    setNotice('');
    setIsLoading(true);

    try {
      await login(trimmedEmail, password);
      sessionStorage.removeItem('auth_redirect_reason');
      navigate('/dashboard');
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      const data = err?.data || err?.response?.data;

      if (status === 429) {
        const retryAfter = err?.retryAfterSeconds || 60;
        setRetryCountdown(retryAfter);
        setError(`Too many login attempts. Please wait ${retryAfter} seconds.`);
      } else if (status === 401) {
        setError(data?.message || 'Invalid email or password.');
      } else if (status === 403) {
        setError('Your account has been deactivated. Please contact an administrator.');
      } else {
        setError(data?.message || 'Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = isLoading || retryCountdown > 0;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        position: 'relative',
        padding: '24px 16px',
      }}
    >
      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
        <ThemeToggle />
      </div>

      <div
        className="card fade-in"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-dropdown)',
        }}
      >
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--text-primary)',
              color: 'var(--bg)',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '15px',
              letterSpacing: '-0.02em',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            IP
          </div>
          <h1
            style={{
              margin: '0 0 6px 0',
              color: 'var(--text-primary)',
              fontSize: '24px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            Welcome to IntelliPlace
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Sign in to access your placement readiness portal
          </p>
        </div>

        {notice && (
          <div
            role="status"
            className="alert alert-info"
            style={{ marginBottom: '16px', fontSize: '13px' }}
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="alert alert-error"
            style={{ marginBottom: '16px', fontSize: '13px' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="you@example.com"
              className="input-field"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label
                htmlFor="password"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                style={{ fontSize: '12px', color: 'var(--accent-text)', textDecoration: 'none', fontWeight: 500 }}
              >
                Forgot password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="••••••••"
                className="input-field"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '16px' }}
          >
            {isLoading
              ? 'Signing in...'
              : retryCountdown > 0
              ? `Retry in ${retryCountdown}s`
              : 'Sign In'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--text-muted)',
            margin: 0,
          }}
        >
          New student?{' '}
          <Link
            to="/register"
            style={{
              color: 'var(--accent-text)',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
