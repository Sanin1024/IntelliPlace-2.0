import { useEffect, useState } from 'react';
import { userApi, publicApi } from '../../api/admin';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters state
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ role: '', batch: '', department: '', section: '' });
  
  // Dropdown options state
  const [batches, setBatches] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Fetch dropdown options on mount
  useEffect(() => {
    publicApi.getBranches().then(setBranches).catch(() => {});
    publicApi.getBatches().then(setBatches).catch(() => {});
  }, []);

  // Fetch users when filters, search, or page changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadUsers();
    }, 300); // Debounce search input

    return () => clearTimeout(timeout);
  }, [search, filters, meta.page]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await userApi.getAll({
        search,
        role: filters.role,
        batch: filters.batch,
        department: filters.department,
        section: filters.section,
        page: meta.page,
        limit: 10,
      });
      setUsers(res.data);
      setMeta(res.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: 'role' | 'batch' | 'department' | 'section', value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setMeta(m => ({ ...m, page: 1 })); // Reset to page 1 on filter change
  };

  const clearFilters = () => {
    setSearch('');
    setFilters({ role: '', batch: '', department: '', section: '' });
    setMeta(m => ({ ...m, page: 1 }));
  };

  return (
    <div>
      <h1>Manage Users</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>Filter and manage student, staff, and admin accounts.</p>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Search name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setMeta(m => ({...m, page: 1})); }}
          style={{ ...inp, flex: 1, minWidth: '200px' }}
        />
        
        <select value={filters.role} onChange={(e) => handleFilterChange('role', e.target.value)} style={inp}>
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="trainer">Tutor</option>
          <option value="po">Placement & Training Officer</option>
          <option value="admin">Admin</option>
        </select>

        <select value={filters.department} onChange={(e) => handleFilterChange('department', e.target.value)} style={inp}>
          <option value="">All Departments</option>
          {branches.map(b => <option key={b.id} value={b.code}>{b.code} - {b.name}</option>)}
        </select>

        <select value={filters.batch} onChange={(e) => handleFilterChange('batch', e.target.value)} style={inp}>
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>

        <select 
          value={filters.section} 
          onChange={(e) => handleFilterChange('section', e.target.value)} 
          style={inp}
        >
          <option value="">All Sections</option>
          <option value="CSA">CSA</option>
          <option value="CSB">CSB</option>
          <option value="NOT_APPLICABLE">Not Applicable</option>
        </select>

        <button onClick={clearFilters} style={clearBtn}>Clear</button>
      </div>

      {/* Results Count */}
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
        Showing {users.length} of {meta.total} matching users
      </p>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <EmptyState icon="🔍" title="No Users Found" description="No users match the selected filter criteria." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Role</th>
                <th style={th}>Department</th>
                <th style={th}>Batch</th>
                <th style={th}>Section</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={td}>
                    <strong>{u.name}</strong>
                    {u.studentProfile?.ktuid && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#6366f1', fontWeight: 600, background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>
                        {u.studentProfile.ktuid}
                      </span>
                    )}
                  </td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>
                    <span style={roleBadge(u.role)}>
                      {u.role === 'po' ? 'PT Officer' : u.role === 'trainer' ? 'Tutor' : u.role}
                    </span>
                  </td>
                  <td style={td}>{u.studentProfile?.branch?.code || '—'}</td>
                  <td style={td}>{u.studentProfile?.batch?.name || '—'}</td>
                  <td style={td}>{u.studentProfile?.section || '—'}</td>
                  <td style={td}>
                    <span style={{ color: u.isActive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination 
        page={meta.page} 
        totalPages={meta.totalPages} 
        onPageChange={(p) => setMeta(m => ({...m, page: p}))} 
      />
    </div>
  );
}

// Styles
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '14px', background: 'var(--color-surface)', color: 'var(--color-text)' };
const clearBtn: React.CSSProperties = { padding: '10px 16px', background: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', background: 'var(--color-surface-hover)', borderBottom: '2px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid var(--color-border)', fontSize: '14px', whiteSpace: 'nowrap', color: 'var(--color-text)' };

function roleBadge(role: string): React.CSSProperties {
  const colors: Record<string, string> = {
    admin: 'var(--color-role-admin)', 
    po: 'var(--color-role-po)',      // PT Officer color
    trainer: 'var(--color-role-trainer)', // Tutor color
    student: 'var(--color-role-student)',
  };
  const color = colors[role] || 'var(--color-text-muted)';
  return {
    background: `color-mix(in srgb, ${color} 15%, transparent)`, 
    color,
    padding: '2px 10px', 
    borderRadius: '10px', 
    fontSize: '12px', 
    fontWeight: 600,
  };
}
