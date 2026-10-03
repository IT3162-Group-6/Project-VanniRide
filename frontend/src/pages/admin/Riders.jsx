import { useEffect, useMemo, useState } from 'react';
import UserTable from '../../components/UserTable';
import { adminApi } from '../../services/api';
import { useAppState } from '../../context/AppState';

export default function Riders() {
  const { showToast } = useAppState();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { adminApi.riders().then(setUsers).catch((e) => setError(e.message)); }, []);

  const shown = useMemo(
    () => users.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase())),
    [users, q],
  );
  const pending = users.filter((u) => u.riderProfile?.approvalStatus === 'pending');

  async function review(user, decision) {
    const action = decision === 'APPROVE' ? 'approving' : 'rejecting';
    const reason = window.prompt(`Reason for ${action} ${user.name}:`);
    if (!reason?.trim()) return;
    try {
      const profile = await adminApi.reviewRider(user.id, decision, reason.trim());
      setUsers((list) => list.map((item) => item.id === user.id ? { ...item, riderProfile: profile, online: false } : item));
      showToast(`${user.name} was ${decision === 'APPROVE' ? 'approved' : 'rejected'}`); setError('');
    } catch (requestError) { setError(requestError.message); }
  }

  async function setAccountStatus(user) {
    const next = user.status === 'active' ? 'suspended' : 'active';
    const reason = window.prompt(`Reason for changing ${user.name} to ${next}:`);
    if (!reason?.trim()) return;
    try {
      const updated = await adminApi.setUserStatus(user.id, next, reason.trim());
      setUsers((list) => list.map((item) => item.id === user.id ? { ...item, ...updated, riderProfile: item.riderProfile } : item));
      showToast(`${user.name} is now ${next}`); setError('');
    } catch (requestError) { setError(requestError.message); }
  }

  return (
    <>
      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-head"><h3>Pending approvals ({pending.length})</h3></div>
          {pending.map((u) => (
            <div key={u.id} className="req-row">
              <span className="avatar avatar-sm">{u.name[0]}</span>
              <div className="req-meta"><b>{u.name}</b><span>{u.email} · {u.vehicle || 'No vehicle added'}</span></div>
              <div className="req-actions">
                <button className="btn btn-primary btn-sm" onClick={() => review(u, 'APPROVE')}>Approve</button>
                <button className="btn btn-ghost btn-sm" onClick={() => review(u, 'REJECT')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-head"><h3>Riders ({users.length})</h3></div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="toolbar">
          <input className="search-input" placeholder="Search riders…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <UserTable
          users={shown}
          columns={[
            { key: 'vehicle', label: 'Vehicle' },
            { key: 'approval', label: 'Approval', render: (u) => u.riderProfile?.approvalStatus || 'pending' },
            { key: 'online', label: 'Availability', render: (u) => (u.online ? 'Online' : 'Offline') },
          ]}
          onToggleStatus={setAccountStatus}
        />
      </div>
    </>
  );
}
