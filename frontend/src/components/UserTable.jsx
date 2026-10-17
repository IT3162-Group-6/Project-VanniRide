import StatusBadge from './StatusBadge';

/**
 * Admin table of users. `columns` lets each page show role specific fields.
 */
export default function UserTable({ users, columns = [], onToggleStatus }) {
  if (!users.length) return <p className="muted">No users match the current role, status, or search filters.</p>;

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
              <td data-label="Name">
                <div className="cell-user">
                  <span className="avatar avatar-sm">{u.name[0]}</span>
                  <div><b>{u.name}</b><span>{u.phone || '—'}</span></div>
                </div>
              </td>
              <td data-label="Email">{u.email}</td>
              {columns.map((c) => <td data-label={c.label} key={c.key}>{c.render ? c.render(u) : (u[c.key] ?? '—')}</td>)}
              <td data-label="Status"><StatusBadge status={u.status} /></td>
              {onToggleStatus && (
                <td data-label="Account action">
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
