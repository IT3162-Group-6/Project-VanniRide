import { useEffect, useMemo, useState } from 'react';
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
  const [resetForm, setResetForm] = useState({ temporaryPassword: '', reason: '' });
  const [resetBusy, setResetBusy] = useState(false);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([adminApi.users(), adminApi.passwordResetRequests()])
      .then(([userList, requestList]) => {
        setUsers(userList);
        setResetRequests(requestList);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const shown = useMemo(() => users
    .filter((u) => (tab === 'all' ? true : u.role === tab))
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
      await adminApi.resolvePasswordResetRequest(
        selectedRequest.id,
        resetForm.temporaryPassword,
        resetForm.reason.trim()
      );
      setResetRequests((requests) => requests.filter((request) => request.id !== selectedRequest.id));
      showToast(`Temporary password set for ${selectedRequest.user.name}`);
      setSelectedRequest(null);
      setResetForm({ temporaryPassword: '', reason: '' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><h3>Password reset requests ({resetRequests.length})</h3></div>
        {error && <div className="alert alert-error">{error}</div>}
        <p className="muted">Verify the requester through an established university channel before assigning a temporary password.</p>
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
                    <td><button className="btn btn-outline btn-sm" onClick={() => { setSelectedRequest(request); setResetForm({ temporaryPassword: '', reason: '' }); }}>Resolve</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedRequest && (
          <form onSubmit={resolvePasswordReset} className="password-reset-admin-form">
            <h4>Set temporary password for {selectedRequest.user.name}</h4>
            <div className="field">
              <label htmlFor="temporary-password">Temporary password</label>
              <input id="temporary-password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" value={resetForm.temporaryPassword} onChange={(event) => setResetForm({ ...resetForm, temporaryPassword: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="password-reset-reason">Verification note</label>
              <textarea id="password-reset-reason" required maxLength={500} placeholder="Example: Identity confirmed through university office" value={resetForm.reason} onChange={(event) => setResetForm({ ...resetForm, reason: event.target.value })} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setSelectedRequest(null)} disabled={resetBusy}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={resetBusy}>{resetBusy ? 'Saving…' : 'Set temporary password'}</button>
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
          columns={[{ key: 'role', label: 'Role', render: (u) => <span className="chip" style={{ textTransform: 'capitalize' }}>{u.role}</span> },
                    { key: 'joined', label: 'Joined' }]}
          onToggleStatus={toggle}
        />
      </div>
    </>
  );
}
