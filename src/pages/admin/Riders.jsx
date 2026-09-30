import { useEffect, useMemo, useState } from 'react';
import UserTable from '../../components/UserTable';
import { adminApi } from '../../services/api';
import { useAppState } from '../../context/AppState';

export default function Riders() {
  const { showToast } = useAppState();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => { adminApi.users('rider').then(setUsers); }, []);

  const shown = useMemo(
    () => users.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase())),
    [users, q],
  );
  const pending = users.filter((u) => u.status === 'pending');

  async function setStatus(user, next) {
    const updated = await adminApi.setUserStatus(user.id, next);
    setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
    showToast(`${user.name} is now ${next}`);
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
                <button className="btn btn-primary btn-sm" onClick={() => setStatus(u, 'active')}>Approve</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setStatus(u, 'suspended')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-head"><h3>Riders ({users.length})</h3></div>
        <div className="toolbar">
          <input className="search-input" placeholder="Search riders…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <UserTable
          users={shown}
          columns={[
            { key: 'vehicle', label: 'Vehicle' },
            { key: 'rating', label: 'Rating', render: (u) => `${u.rating ?? 5}★` },
            { key: 'earnings', label: 'Earnings', render: (u) => `LKR ${Number(u.earnings || 0).toLocaleString()}` },
            { key: 'online', label: 'Availability', render: (u) => (u.online ? 'Online' : 'Offline') },
          ]}
          onToggleStatus={(u) => setStatus(u, u.status === 'active' ? 'suspended' : 'active')}
        />
      </div>
    </>
  );
}
