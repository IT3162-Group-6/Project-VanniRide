import { useCallback, useEffect, useMemo, useState } from 'react';
import UserTable from '../../components/UserTable';
import { adminApi } from '../../services/api';
import { useAppState } from '../../context/appStateStore';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'customer', label: 'Customers' },
  { key: 'rider', label: 'Riders' },
  { key: 'admin', label: 'Admins' },
];

export default function Users() {
  const { showToast } = useAppState();
  const [users, setUsers] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [resetForm, setResetForm] = useState({ reason: '' });
  const [approvedReset, setApprovedReset] = useState(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback((showProgress = false) => {
    if (showProgress) setRefreshing(true);
    return Promise.all([adminApi.users(), adminApi.passwordResetRequests()])
      .then(([userList, requestList]) => {
        setUsers(userList);
        setResetRequests(requestList);
        setLastUpdated(new Date());
        setError('');
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => loadData(), 0);
    const refreshTimer = window.setInterval(() => loadData(), 30_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshTimer);
    };
  }, [loadData]);

  const shown = useMemo(() => users
    .filter((u) => (tab === 'all' ? true : (u.roles || [u.role]).includes(tab)))
    .filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase())), [users, tab, q]);

  async function toggle(user) {
    const next = user.status === 'active' ? 'suspended' : 'active';
    const reason = window.prompt(`Reason for changing ${user.name} to ${next}:`);
    if (!reason?.trim()) return;
    try {
      const updated = await adminApi.setUserStatus(user.id, next, reason.trim());
      setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
      showToast(`${user.name} is now ${next}`); setError('');
    } catch (requestError) { setError(requestError.message); }
  }

  async function resolvePasswordReset(event) {
    event.preventDefault();
    if (!selectedRequest) return;
    setResetBusy(true);
    setError('');
    try {
      const approved = await adminApi.resolvePasswordResetRequest(
        selectedRequest.id,
        resetForm.reason.trim()
      );
      setResetRequests((requests) => requests.filter((request) => request.id !== selectedRequest.id));
      setApprovedReset({ ...approved, userName: selectedRequest.user.name });
      showToast(`Reset access approved for ${selectedRequest.user.name}`);
      setSelectedRequest(null);
      setResetForm({ reason: '' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <div>
            <h3>Password reset requests ({resetRequests.length})</h3>
            {lastUpdated && <small className="muted">Updated {lastUpdated.toLocaleTimeString()}</small>}
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => loadData(true)} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <p className="muted">The national ID number and security answer matched before the request was created. Verify the person through an established university channel before granting a one-time reset link.</p>
        {approvedReset && (
          <div className="alert alert-ok password-reset-link-result">
            <b>Reset access approved for {approvedReset.userName}</b>
            <span>
              {approvedReset.deliveryMethod === 'EMAIL'
                ? 'The reset link was sent to the registered university email.'
                : 'Share this link only through the verified university channel.'}
              {' '}It expires {new Date(approvedReset.expiresAt).toLocaleString()}.
            </span>
            {approvedReset.deliveryMethod !== 'EMAIL' && (
              <>
                <input aria-label="Approved reset link" readOnly value={approvedReset.resetUrl || ''} onFocus={(event) => event.target.select()} />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => navigator.clipboard?.writeText(approvedReset.resetUrl).then(() => showToast('Reset link copied')).catch(() => showToast('Select and copy the link manually'))}>Copy reset link</button>
              </>
            )}
          </div>
        )}
        {!resetRequests.length ? (
          <p className="muted">No pending password reset requests.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>User</th><th>Email</th><th>Requested</th><th></th></tr></thead>
              <tbody>
                {resetRequests.map((request) => (
                  <tr key={request.id}>
                    <td><b>{request.user.name}</b></td>
                    <td>{request.user.email}</td>
                    <td>{new Date(request.requestedAt).toLocaleString()}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => { setSelectedRequest(request); setResetForm({ reason: '' }); setApprovedReset(null); }}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedRequest && (
          <form onSubmit={resolvePasswordReset} className="password-reset-admin-form">
            <h4>Approve reset access for {selectedRequest.user.name}</h4>
            <div className="recovery-verification-summary">
              <span><b>Submitted national ID</b>{selectedRequest.identityNumber}</span>
              <span><b>Matched question</b>{selectedRequest.securityQuestionLabel}</span>
            </div>
            <div className="field">
              <label htmlFor="password-reset-reason">Verification note</label>
              <textarea id="password-reset-reason" required maxLength={500} placeholder="Example: Identity confirmed through university office" value={resetForm.reason} onChange={(event) => setResetForm({ ...resetForm, reason: event.target.value })} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setSelectedRequest(null)} disabled={resetBusy}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={resetBusy}>{resetBusy ? 'Approving…' : 'Approve reset link'}</button>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <div className="card-head"><h3>All Users ({users.length})</h3></div>

        <div className="toolbar">
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>
          <input className="search-input" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <UserTable
          users={shown}
          columns={[{ key: 'role', label: 'Roles', render: (u) => <span className="chip" style={{ textTransform: 'capitalize' }}>{(u.roles || [u.role]).join(' / ')}</span> },
                    { key: 'joined', label: 'Joined' }]}
          onToggleStatus={toggle}
        />
      </div>
    </>
  );
}
