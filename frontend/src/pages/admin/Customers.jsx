import { useEffect, useMemo, useState } from 'react';
import UserTable from '../../components/UserTable';
import { adminApi } from '../../services/api';
import { useAppState } from '../../context/AppState';

export default function Customers() {
  const { showToast } = useAppState();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { adminApi.users('customer').then(setUsers).catch((e) => setError(e.message)); }, []);

  const shown = useMemo(
    () => users.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase())),
    [users, q],
  );

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
      <div className="card-head"><h3>Customers ({users.length})</h3></div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="toolbar">
        <input className="search-input" placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <UserTable
        users={shown}
        columns={[
          { key: 'faculty', label: 'Faculty' },
          { key: 'wallet', label: 'Wallet', render: (u) => `LKR ${Number(u.wallet || 0).toFixed(2)}` },
          { key: 'joined', label: 'Joined' },
        ]}
        onToggleStatus={toggle}
      />
    </div>
  );
}
