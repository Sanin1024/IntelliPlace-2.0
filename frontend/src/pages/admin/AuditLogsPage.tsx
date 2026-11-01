import { useEffect, useState, Fragment } from 'react';
import { auditApi } from '../../api/audit';
import type { AuditLog } from '../../api/audit';
import Pagination from '../../components/Pagination';

const TARGET_TYPES = ['user', 'branch', 'batch', 'company', 'student_profile'];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [actions, setActions] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await auditApi.getLogs({
        page: meta.page,
        limit: 25,
        ...(search && { search }),
        ...(filterAction && { action: filterAction }),
        ...(filterTarget && { targetType: filterTarget }),
        ...(filterOutcome && { outcome: filterOutcome }),
      });
      setLogs(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    auditApi.getActions().then(setActions).catch(() => setActions([]));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [search, filterAction, filterTarget, filterOutcome, meta.page]);

  const actionColor = (action: string) => {
    if (action.includes('delete')) return '#dc2626';
    if (action.includes('create')) return '#16a34a';
    if (action.includes('toggle') || action.includes('disable')) return '#d97706';
    if (action.includes('update') || action.includes('change')) return '#1a73e8';
    return '#64748b';
  };

  const formatAction = (action: string) => {
    return action.replace(/\./g, ' → ').replace(/_/g, ' ');
  };

  return (
    <div>
      <h1>Audit Logs</h1>
      <p style={{ color: '#64748b', fontSize: '14px' }}>
        Immutable record of sensitive administrative actions. {meta.total} events total.
      </p>

      {error && <div style={errAlert}>{error}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setMeta(m => ({...m, page: 1})); }}
          placeholder="🔍 Search action or target ID..."
          style={{ ...inp, flex: 1, minWidth: '180px' }}
        />
        <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setMeta(m => ({...m, page: 1})); }} style={{...inp, width: '180px'}}>
          <option value="">All actions</option>
          {actions.map(a => <option key={a} value={a}>{formatAction(a)}</option>)}
        </select>
        <select value={filterTarget} onChange={(e) => { setFilterTarget(e.target.value); setMeta(m => ({...m, page: 1})); }} style={{...inp, width: '150px'}}>
          <option value="">All targets</option>
          {TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterOutcome} onChange={(e) => { setFilterOutcome(e.target.value); setMeta(m => ({...m, page: 1})); }} style={{...inp, width: '120px'}}>
          <option value="">All outcomes</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
      </div>

      {/* Logs table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Timestamp</th>
              <th style={th}>Actor</th>
              <th style={th}>Action</th>
              <th style={th}>Target</th>
              <th style={th}>Outcome</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{...td, textAlign: 'center', padding: '40px'}}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} style={{...td, textAlign: 'center', padding: '40px', color: '#94a3b8'}}>
                No audit events match these filters.
              </td></tr>
            ) : (
              logs.map(log => (
                <Fragment key={log.id}>
                  <tr
                    style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td style={{...td, whiteSpace: 'nowrap'}}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={td}>
                      <strong style={{ fontSize: '13px' }}>{log.actor?.name}</strong>
                      <br />
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{log.actor?.role}</span>
                    </td>
                    <td style={td}>
                      <span style={{
                        fontSize: '12px', fontWeight: 600,
                        color: actionColor(log.action),
                      }}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td style={{...td, fontSize: '12px', color: '#64748b'}}>
                      {log.targetType}{log.targetId ? ` (${log.targetId.substring(0, 8)}...)` : ''}
                    </td>
                    <td style={td}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                        background: log.outcome === 'success' ? '#f0fdf4' : '#fef2f2',
                        color: log.outcome === 'success' ? '#16a34a' : '#dc2626',
                      }}>
                        {log.outcome === 'success' ? '✓ Success' : '✗ Failure'}
                      </span>
                    </td>
                    <td style={{...td, textAlign: 'right'}}>
                      {log.metadata && <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {expandedId === log.id ? '▲' : '▼'}
                      </span>}
                    </td>
                  </tr>
                  {expandedId === log.id && log.metadata && (
                    <tr key={`${log.id}-meta`}>
                      <td colSpan={6} style={{ padding: '0' }}>
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
                          <pre style={{ margin: 0, fontSize: '12px', color: '#475569', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={(p) => setMeta(m => ({...m, page: p}))}
      />
    </div>
  );
}

const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '12px', color: '#64748b', fontWeight: 600 };
const td: React.CSSProperties = { padding: '10px 14px', fontSize: '13px', verticalAlign: 'middle' };
const errAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#fee2e2', color: '#dc2626' };