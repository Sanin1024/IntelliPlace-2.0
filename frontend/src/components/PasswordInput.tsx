import { useState, KeyboardEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  autoComplete?: string;
  required?: boolean;
  showStrength?: boolean;
}

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  required,
  showStrength,
}: Props) {
  const [show, setShow] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const handleKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  };

  const strength = value.length < 8 ? 0 : value.length < 12 ? 1 : 2;
  const strengthLabel = ['Weak', 'Medium', 'Strong'][strength];
  const strengthColors = ['var(--error-text)', 'var(--warning-text)', 'var(--success-text)'];
  const strengthBgColors = ['var(--error)', 'var(--warning)', 'var(--success)'];

  return (
    <div style={{ marginBottom: '16px' }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '6px',
          color: 'var(--text-secondary)',
        }}
      >
        {label} {required && <span style={{ color: 'var(--error)' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyUp={handleKeyUp}
          autoComplete={autoComplete || 'current-password'}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="input-field"
          style={{
            paddingRight: '40px',
            borderColor: error ? 'var(--error-border)' : undefined,
          }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
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
            borderRadius: 'var(--radius-none)',
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {capsLockOn && (
        <p style={{ color: 'var(--warning-text)', fontSize: '12px', marginTop: '4px' }}>
          Caps Lock is ON
        </p>
      )}
      {showStrength && value.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
          <div
            style={{
              flex: 1,
              height: '4px',
              backgroundColor: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(strength + 1) * 33.33}%`,
                height: '100%',
                backgroundColor: strengthBgColors[strength],
                transition: 'all var(--transition-fast)',
              }}
            />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 500, color: strengthColors[strength] }}>
            {strengthLabel}
          </span>
        </div>
      )}
      {error && (
        <p id={`${id}-error`} style={{ color: 'var(--error-text)', fontSize: '12px', marginTop: '4px' }}>
          {error}
        </p>
      )}
    </div>
  );
}
