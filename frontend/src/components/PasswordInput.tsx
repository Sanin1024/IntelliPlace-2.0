import { useState, KeyboardEvent } from 'react';

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

export default function PasswordInput({ id, label, value, onChange, onBlur, error, autoComplete, required, showStrength }: Props) {
  const [show, setShow] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const handleKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  };

  const strength = value.length < 8 ? 0 : value.length < 12 ? 1 : 2;
  const strengthLabel = ['Weak', 'Medium', 'Strong'][strength];
  const strengthColor = ['#dc2626', '#d97706', '#16a34a'][strength];

  return (
    <div style={{ marginBottom: '16px' }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
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
          style={{
            width: '100%', padding: '10px 40px 10px 12px', borderRadius: '6px',
            border: `1px solid ${error ? '#dc2626' : '#ddd'}`, fontSize: '14px', boxSizing: 'border-box'
          }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
          style={{
            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#64748b'
          }}
        >
          {show ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>
      {capsLockOn && <p style={{ color: '#d97706', fontSize: '12px', marginTop: '4px' }}>Caps Lock is ON</p>}
      {showStrength && value.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px' }}>
            <div style={{ width: `${(strength + 1) * 33}%`, height: '100%', background: strengthColor, borderRadius: '2px' }} />
          </div>
          <span style={{ fontSize: '11px', color: strengthColor }}>{strengthLabel}</span>
        </div>
      )}
      {error && <p id={`${id}-error`} style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}