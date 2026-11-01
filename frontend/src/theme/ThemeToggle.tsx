import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme preference"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--surface-muted)',
        border: '1px solid var(--border)',
        gap: '2px',
        userSelect: 'none',
      }}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${opt.label} theme`}
            title={`${opt.label} theme`}
            onClick={() => setTheme(opt.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              minHeight: '30px',
              borderRadius: 'var(--radius-full)',
              border: isSelected ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer',
              backgroundColor: isSelected ? 'var(--surface)' : 'transparent',
              color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: isSelected ? 'var(--shadow-card)' : 'none',
              transition: 'all var(--transition-fast)',
              padding: 0,
            }}
          >
            <Icon size={14} strokeWidth={isSelected ? 2.2 : 1.8} />
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;
