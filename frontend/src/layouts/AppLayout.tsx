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
  { to: '/tests', label: 'Mock Tests', icon: '📋', roles: ['student'] },
  { to: '/practice', label: 'Practice', icon: '📝', roles: ['student'] },
  { to: '/problems', label: 'Coding Problems', icon: '💻', roles: ['student', 'trainer'] },
  { to: '/companies', label: 'Companies', icon: '🏢', roles: ['student', 'po'] },
  { to: '/drives', label: 'Placement Drives', icon: '🎯', roles: ['student', 'po', 'admin'] },
  { to: '/applications', label: 'My Applications', icon: '📂', roles: ['student'] },
  { to: '/offers', label: 'My Offers', icon: '🏆', roles: ['student'] },
  { to: '/training', label: 'Training Hub', icon: '🎓', roles: ['student'] },
  { to: '/training/resources', label: 'Resource Library', icon: '📚', roles: ['student'] },
  { to: '/mechanical-training', label: 'ME Training', icon: '⚙️', roles: ['student'] },
  { to: '/mechanical-training/questions', label: 'ME Questions', icon: '📝', roles: ['student'] },
  { to: '/mechanical-training/projects', label: 'ME Projects', icon: '🔧', roles: ['student'] },
  { to: '/mechanical-training/companies', label: 'ME Companies', icon: '🏢', roles: ['student'] },
  { to: '/mechanical-training/software', label: 'ME Software', icon: '💻', roles: ['student'] },
  { to: '/civil-training', label: 'Civil Training', icon: '🏗️', roles: ['student'] },
  { to: '/civil-training/questions', label: 'Civil Questions', icon: '📝', roles: ['student'] },
  { to: '/civil-training/companies', label: 'Civil Companies', icon: '🏢', roles: ['student'] },
  { to: '/ece-training', label: 'ECE Training', icon: '📡', roles: ['student'] },
  { to: '/ece-training/questions', label: 'ECE Questions', icon: '📝', roles: ['student'] },
  { to: '/ece-training/companies', label: 'ECE Companies', icon: '🔌', roles: ['student'] },
  { to: '/eee-training', label: 'EEE Training', icon: '⚡', roles: ['student'] },
  { to: '/eee-training/questions', label: 'EEE Questions', icon: '📝', roles: ['student'] },
  { to: '/eee-training/practicals', label: 'EEE Practicals', icon: '🔧', roles: ['student'] },
  { to: '/eee-training/companies', label: 'EEE Companies', icon: '🏢', roles: ['student'] },
  { to: '/it-training', label: 'IT Training', icon: '💻', roles: ['student'] },
  { to: '/it-training/questions', label: 'IT Questions', icon: '📝', roles: ['student'] },
  { to: '/it-training/practicals', label: 'IT Practicals', icon: '🚀', roles: ['student'] },
  { to: '/it-training/companies', label: 'IT Companies', icon: '🏢', roles: ['student'] },
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
  po: 'PT OFFICER',       // Placement & Training Officer
  trainer: 'TUTOR',        // Tutor
  student: 'STUDENT'
};

const roleColors: Record<string, string> = {
  admin: 'var(--color-role-admin)',
  po: 'var(--color-role-po)',
  trainer: 'var(--color-role-trainer)',
  student: 'var(--color-role-student)',
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
      <div
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            background: 'var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-on-primary)',
            fontWeight: 800,
            fontSize: '14px',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0,
          }}
        >
          IP
        </div>
        <h2
          style={{
            margin: 0,
            color: 'var(--color-text)',
            fontSize: '18px',
            fontWeight: 800,
            letterSpacing: '-0.025em',
          }}
        >
          IntelliPlace
        </h2>
      </div>

      <nav
        style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}
        aria-label="Main navigation"
      >
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
              textDecoration: 'none',
              borderRadius: 'var(--radius-md)',
              marginBottom: '4px',
              fontSize: '14px',
              fontWeight: 600,
              background: isActive ? 'var(--color-primary-light)' : 'transparent',
              transition: 'all var(--transition-fast)',
            })}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span style={{ marginRight: '12px', fontSize: '16px' }} aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{
            width: '100%',
            justifyContent: 'center',
            color: 'var(--color-danger)',
          }}
        >
          🚪 Logout
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Desktop Sidebar */}
      <aside
        style={{
          width: '260px',
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
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
            background: 'rgba(0,0,0,0.5)',
            zIndex: 100,
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <aside
            style={{
              width: '260px',
              background: 'var(--color-surface)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
            }}
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Content Area with Single Outlet */}
      <div
        className="main-layout-area"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          minWidth: 0,
        }}
      >
        {/* Desktop Header */}
        <header
          className="desktop-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 32px',
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div>
            <span style={{ 
              background: `color-mix(in srgb, ${roleColors[user.role] || 'var(--color-primary)'} 20%, transparent)`, 
              color: roleColors[user.role] || 'var(--color-primary)', 
              padding: '4px 12px', 
              borderRadius: '12px', 
              fontSize: '12px', 
              fontWeight: 600, 
              textTransform: 'uppercase' 
            }}>
              {roleLabels[user.role] || user.role.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <ThemeToggle />
            <NotificationBell />
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '14px',
                  color: 'var(--color-text)',
                }}
              >
                {user.name}
              </div>
              <div
                style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}
                className="text-ellipsis"
              >
                {user.email}
              </div>
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
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--color-text)',
              padding: '4px',
            }}
            aria-label="Open navigation menu"
          >
            ☰
          </button>
          <h2
            style={{
              margin: 0,
              color: 'var(--color-primary)',
              fontSize: '18px',
              fontWeight: 800,
            }}
          >
            IntelliPlace
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        {/* Single Main Viewport */}
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
