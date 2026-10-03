import { useEffect, useMemo, useState } from 'react';
import UserTable from '../../components/UserTable';
import { adminApi } from '../../services/api';
import { useAppState } from '../../context/AppState';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'customer', label: 'Customers' },
  { key: 'rider', label: 'Riders' },
  { key: 'admin', label: 'Admins' },
];

export default function Users() {
  const { showToast } = useAppState();
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { adminApi.users().then(setUsers).catch((e) => setError(e.message)); }, []);

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

  return (
    <div className="card">
      <div className="card-head"><h3>All Users ({users.length})</h3></div>
      {error && <div className="alert alert-error">{error}</div>}

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
  );
}
