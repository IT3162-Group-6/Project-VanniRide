import StatusBadge from './StatusBadge';

/**
 * Admin table of users. `columns` lets each page show role specific fields.
 */
export default function UserTable({ users, columns = [], onToggleStatus }) {
  if (!users.length) return <p className="muted">No users found.</p>;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            {columns.map((c) => <th key={c.key}>{c.label}</th>)}
            <th>Status</th>
            {onToggleStatus && <th></th>}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <div className="cell-user">
                  <span className="avatar avatar-sm">{u.name[0]}</span>
                  <div><b>{u.name}</b><span>{u.phone || '—'}</span></div>
                </div>
              </td>
              <td>{u.email}</td>
              {columns.map((c) => <td key={c.key}>{c.render ? c.render(u) : (u[c.key] ?? '—')}</td>)}
              <td><StatusBadge status={u.status} /></td>
              {onToggleStatus && (
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => onToggleStatus(u)}>
                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
