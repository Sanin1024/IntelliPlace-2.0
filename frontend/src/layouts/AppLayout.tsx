import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';
import NotificationBell from '../components/NotificationBell';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: '🏠',
    roles: ['student', 'po', 'trainer', 'admin'],
  },
  {
    to: '/analytics',
    label: 'My Analytics',
    icon: '📊',
    roles: ['student'],
  },
  {
    to: '/tests',
    label: 'Mock Tests',
    icon: '📋',
    roles: ['student', 'trainer'],
  },
  {
    to: '/practice',
    label: 'Practice',
    icon: '📝',
    roles: ['student'],
  },
  {
    to: '/problems',
    label: 'Coding Problems',
    icon: '💻',
    roles: ['student', 'trainer'],
  },
  {
    to: '/companies',
    label: 'Companies',
    icon: '🏢',
    roles: ['student', 'po'],
  },
  {
    to: '/resources',
    label: 'Resources',
    icon: '📚',
    roles: ['student', 'trainer'],
  },
  {
    to: '/profile',
    label: 'My Profile',
    icon: '👤',
    roles: ['student'],
  },
  {
    to: '/po/students',
    label: 'Students',
    icon: '👥',
    roles: ['po'],
  },
  {
    to: '/po/companies',
    label: 'Publish Drive',
    icon: '📢',
    roles: ['po'],
  },
  {
    to: '/trainer/questions',
    label: 'Question Bank',
    icon: '❓',
    roles: ['trainer'],
  },
  {
    to: '/trainer/problems',
    label: 'Problem Bank',
    icon: '⚙️',
    roles: ['trainer'],
  },
  {
    to: '/trainer/tests',
    label: 'Test Builder',
    icon: '🏗️',
    roles: ['trainer'],
  },
  {
    to: '/trainer/resources',
    label: 'Upload Resource',
    icon: '⬆️',
    roles: ['trainer'],
  },
  {
    to: '/admin/branches',
    label: 'Branches',
    icon: '🏫',
    roles: ['admin'],
  },
  {
    to: '/admin/batches',
    label: 'Batches',
    icon: '📅',
    roles: ['admin'],
  },
  {
    to: '/admin/users',
    label: 'Users',
    icon: '👤',
    roles: ['admin'],
  },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <h2 style={styles.logoText}>IntelliPlace</h2>
        </div>

        <nav style={styles.nav}>
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            🚪 Logout
          </button>
        </div>
      </aside>

      <div style={styles.main}>
        <header style={styles.header}>
          <div>
            <span style={styles.roleBadge}>
              {user.role.toUpperCase()}
            </span>
          </div>

          <div style={styles.headerRight}>
            <NotificationBell />

            <div style={styles.userInfo}>
              <span style={styles.userName}>{user.name}</span>
              <span style={styles.userEmail}>{user.email}</span>
            </div>
          </div>
        </header>

        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
  },

  sidebar: {
    width: '240px',
    background: '#1e293b',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    overflowY: 'auto',
  },

  logo: {
    padding: '20px 16px',
    borderBottom: '1px solid #334155',
  },

  logoText: {
    margin: 0,
    fontSize: '20px',
    color: '#60a5fa',
  },

  nav: {
    flex: 1,
    padding: '12px 8px',
  },

  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    color: '#cbd5e1',
    textDecoration: 'none',
    borderRadius: '8px',
    marginBottom: '4px',
    fontSize: '14px',
    transition: 'all 0.2s',
  },

  navIcon: {
    marginRight: '10px',
    width: '20px',
    textAlign: 'center',
  },

  navLinkActive: {
    background: '#334155',
    color: '#60a5fa',
    fontWeight: 600,
  },

  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid #334155',
  },

  logoutBtn: {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    border: '1px solid #475569',
    color: '#f87171',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },

  main: {
    marginLeft: '240px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  roleBadge: {
    background: '#dbeafe',
    color: '#1e40af',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },

  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },

  userName: {
    fontWeight: 600,
    fontSize: '14px',
  },

  userEmail: {
    fontSize: '12px',
    color: '#64748b',
  },

  content: {
    flex: 1,
    padding: '24px',
    background: '#f8fafc',
    overflowY: 'auto',
  },
};