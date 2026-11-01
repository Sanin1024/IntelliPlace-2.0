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

    if (isLoading || retryCountdown > 0) return;

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
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await register(trimmedEmail, password, trimmedName, ktuid.trim() || undefined);
      navigate('/dashboard');
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      const data = err?.data || err?.response?.data;

      if (status === 429) {
        const retryAfter = err?.retryAfterSeconds || 60;
        setRetryCountdown(retryAfter);
        setError(`Too many registration attempts. Please wait ${retryAfter} seconds.`);
      } else if (status === 409) {
        setError('An account with this email address already exists. Please login instead.');
      } else {
        setError(data?.message || 'Registration failed. Please check your information and try again.');
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
          maxWidth: '440px',
          padding: '40px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-dropdown)',
        }}
      >
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
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
            Create Your Account
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Join IntelliPlace to prepare for campus recruitment
          </p>
        </div>

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
          <div style={{ marginBottom: '14px' }}>
            <label
              htmlFor="name"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              placeholder="e.g. John Doe"
              className="input-field"
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
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

          <div style={{ marginBottom: '14px' }}>
            <label
              htmlFor="ktuid"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              University / KTU ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              id="ktuid"
              type="text"
              value={ktuid}
              onChange={(e) => setKtuid(e.target.value)}
              disabled={isLoading}
              placeholder="e.g. RET21CS001"
              className="input-field"
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="At least 8 characters"
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
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="confirmPassword"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Re-enter password"
                className="input-field"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
              ? 'Creating account...'
              : retryCountdown > 0
              ? `Retry in ${retryCountdown}s`
              : 'Register'}
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
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: 'var(--accent-text)',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
