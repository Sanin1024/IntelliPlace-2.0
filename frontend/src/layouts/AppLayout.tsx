import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import ThemeToggle from '../theme/ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  // Shared / Student
  { to: '/dashboard', label: 'Dashboard', icon: '🏠', roles: ['student', 'po', 'trainer', 'admin'] },
  { to: '/analytics', label: 'My Analytics', icon: '📊', roles: ['student'] },
  { to: '/coding-interview', label: 'Coding Prep', icon: '💻', roles: ['student'] },
  { to: '/coding-interview/problems', label: 'Problem Bank', icon: '📚', roles: ['student'] },
  { to: '/tests', label: 'Mock Tests', icon: '📋', roles: ['student'] },
  { to: '/practice', label: 'Practice', icon: '📝', roles: ['student'] },
  { to: '/problems', label: 'Coding Problems', icon: '💻', roles: ['student', 'trainer'] },
  { to: '/companies', label: 'Companies', icon: '🏢', roles: ['student', 'po'] },
  { to: '/drives', label: 'Placement Drives', icon: '🎯', roles: ['student', 'po', 'admin'] },
  { to: '/applications', label: 'My Applications', icon: '📂', roles: ['student'] },
  { to: '/offers', label: 'My Offers', icon: '🏆', roles: ['student'] },
  { to: '/training', label: 'Training Hub', icon: '🎓', roles: ['student'] },
  { to: '/training/resources', label: 'Resource Library', icon: '📚', roles: ['student'] },
  { to: '/it-training', label: 'IT Training', icon: '💻', roles: ['student'] },
  { to: '/mechanical-training', label: 'ME Training', icon: '⚙️', roles: ['student'] },
  { to: '/civil-training', label: 'Civil Training', icon: '🏗️', roles: ['student'] },
  { to: '/ece-training', label: 'ECE Training', icon: '📡', roles: ['student'] },
  { to: '/eee-training', label: 'EEE Training', icon: '⚡', roles: ['student'] },
  { to: '/recommendations', label: 'For You', icon: '✨', roles: ['student'] },
  { to: '/skills', label: 'My Skills', icon: '🧩', roles: ['student'] },
  { to: '/academic', label: 'Academic & Results', icon: '🎓', roles: ['student'] },
  { to: '/resources', label: 'Resources', icon: '📚', roles: ['student', 'trainer'] },
  { to: '/profile', label: 'My Profile', icon: '👤', roles: ['student'] },
  { to: '/resume', label: 'Resume Builder', icon: '📄', roles: ['student'] },
  { to: '/resumes', label: 'Resume Manager', icon: '📑', roles: ['student'] },
  { to: '/interviews', label: 'Mock Interviews', icon: '🎥', roles: ['student', 'trainer'] },
  { to: '/privacy', label: 'Privacy & Consent', icon: '🛡️', roles: ['student'] },

  // Placement Officer navigation
  { to: '/po/students', label: 'Students', icon: '👥', roles: ['po'] },
  { to: '/po/drives', label: 'Manage Drives', icon: '🚀', roles: ['po', 'admin'] },
  { to: '/po/eligibility', label: 'Eligibility & Shortlist', icon: '🎯', roles: ['po', 'admin'] },
  { to: '/po/academic-integrity', label: 'Academic Integrity', icon: '⚖️', roles: ['po', 'admin'] },
  { to: '/po/assessments', label: 'Assessments', icon: '📋', roles: ['po'] },
  { to: '/admin/training-analytics', label: 'Training Analytics', icon: '📊', roles: ['po', 'admin'] },
  { to: '/po/integrity', label: 'Integrity Flags', icon: '🚩', roles: ['po', 'admin'] },
  { to: '/po/stale-resumes', label: 'Stale Resumes', icon: '⏳', roles: ['po', 'admin'] },

  // Trainer navigation
  { to: '/trainer/questions', label: 'Question Bank', icon: '❓', roles: ['trainer'] },
  { to: '/trainer/problems', label: 'Problem Bank', icon: '⚙️', roles: ['trainer'] },
  { to: '/trainer/tests', label: 'Mock Tests', icon: '📋', roles: ['trainer'] },
  { to: '/trainer/resources', label: 'Upload Resource', icon: '⬆️', roles: ['trainer'] },
  { to: '/trainer/schedule', label: 'Training Schedule', icon: '📅', roles: ['trainer'] },
  { to: '/trainer/progress', label: 'Student Progress', icon: '📈', roles: ['trainer'] },
  { to: '/trainer/batches', label: 'Cohorts & Tasks', icon: '👥', roles: ['trainer'] },

  // Admin navigation
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: '🛡️', roles: ['admin'] },
  { to: '/admin/users', label: 'Users', icon: '👥', roles: ['admin'] },
  { to: '/admin/branches', label: 'Branches', icon: '🏫', roles: ['admin'] },
  { to: '/admin/batches', label: 'Batches', icon: '🎓', roles: ['admin'] },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️', roles: ['admin'] },
  { to: '/admin/bulk-import', label: 'Bulk Import', icon: '📥', roles: ['admin'] },
  { to: '/admin/sync-monitor', label: 'Sync Monitor', icon: '🔄', roles: ['admin'] },
];

const roleLabels: Record<string, string> = {
  admin: 'ADMIN',
  po: 'PT OFFICER',
  trainer: 'TRAINER',
  student: 'STUDENT',
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div
        style={{
          padding: '20px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--nav-bg)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            background: 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--bg)',
            fontWeight: 700,
            fontSize: '13px',
            letterSpacing: '-0.02em',
            flexShrink: 0,
            boxShadow: 'var(--shadow-card)',
          }}
        >
          IP
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2
            style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            IntelliPlace
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
            Career Platform
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          flex: 1,
          padding: '16px 12px',
          overflowY: 'auto',
          background: 'var(--nav-bg)',
        }}
        aria-label="Main navigation"
      >
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bonsai-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span style={{ marginRight: '10px', fontSize: '16px', display: 'flex', alignItems: 'center' }} aria-hidden="true">
              {item.icon}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div
        style={{
          padding: '16px 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--nav-bg)',
        }}
      >
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          style={{
            width: '100%',
            justifyContent: 'center',
            color: 'var(--error-text)',
            borderColor: 'var(--border)',
          }}
        >
          🚪 Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Desktop Sidebar */}
      <aside
        style={{
          width: '260px',
          background: 'var(--nav-bg)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
        }}
        className="desktop-only-sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 100,
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <aside
            style={{
              width: '270px',
              background: 'var(--nav-bg)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-modal)',
              borderRight: '1px solid var(--border)',
            }}
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className="main-layout-area"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          minWidth: 0,
          background: 'var(--bg)',
        }}
      >
        {/* Desktop Header */}
        <header
          className="desktop-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 32px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div>
            <span
              className="badge"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent-text)',
                borderColor: 'var(--accent-border)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '4px 12px',
              }}
            >
              {roleLabels[user.role] || user.role.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ThemeToggle />
            <NotificationBell />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                textAlign: 'right',
                borderLeft: '1px solid var(--border)',
                paddingLeft: '16px',
              }}
            >
              <span
                style={{
                  fontWeight: 500,
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                }}
              >
                {user.name}
              </span>
              <span
                style={{ fontSize: '12px', color: 'var(--text-muted)' }}
                className="text-ellipsis"
              >
                {user.email}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header
          className="mobile-header"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
              }}
              aria-label="Open navigation menu"
            >
              ☰
            </button>
            <h2
              style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontSize: '16px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              IntelliPlace
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        {/* Viewport Outlet */}
        <main
          className="fade-in main-content-body"
          style={{
            flex: 1,
            padding: '32px',
            maxWidth: '1280px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 769px) {
          .main-layout-area { margin-left: 260px; width: calc(100% - 260px) !important; }
          .mobile-header, .mobile-drawer { display: none !important; }
          .desktop-header, .desktop-only-sidebar { display: flex !important; }
        }
        @media (max-width: 768px) {
          .desktop-only-sidebar, .desktop-header { display: none !important; }
          .main-layout-area { margin-left: 0 !important; width: 100% !important; }
          .mobile-header { display: flex !important; }
          .main-content-body { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
