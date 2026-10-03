import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppState';
import { adminApi, isMockAuth, resetDemoData } from '../../services/api';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });

  useEffect(() => { adminApi.stats().then(setStats).catch((requestError) => setError(requestError.message)); }, []);

  async function save(e) {
    e.preventDefault();
    await updateUser(form);
    setEditing(false);
    showToast('Profile updated');
  }

  return (
    <div className="profile-grid">
      <div className="card">
        <div className="profile-head">
          <div className="avatar avatar-lg">{user.name[0]}</div>
          <div><b>{user.name}</b><span>Administrator</span></div>
          <button className="icon-btn" onClick={() => setEditing((v) => !v)} aria-label="Edit"><Icon name="edit" /></button>
        </div>

        {editing ? (
          <form onSubmit={save}>
            <div className="field"><label>Full name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field"><label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-block" type="submit">Save changes</button>
          </form>
        ) : (
          <div className="kv">
            <div><span>Email</span><b>{user.email}</b></div>
            <div><span>Phone</span><b>{user.phone || '—'}</b></div>
            <div><span>Role</span><b>Administrator</b></div>
            <div><span>Joined</span><b>{user.joined}</b></div>
          </div>
        )}

        <button className="btn btn-ghost btn-block" style={{ marginTop: 18 }} onClick={() => { logout(); navigate('/login'); }}>
          Log out
        </button>
      </div>

      <div>
        <div className="card">
          <div className="card-head"><h3>Platform Snapshot</h3></div>
          {error && <div className="alert alert-error">{error}</div>}
          {stats ? (
            <div className="kv">
              <div><span>Customers</span><b>{stats.customers}</b></div>
              <div><span>Riders</span><b>{stats.riders}</b></div>
              <div><span>Total rides</span><b>{stats.totalRides}</b></div>
              <div><span>Revenue</span><b>LKR {stats.revenue.toLocaleString()}</b></div>
            </div>
          ) : <p className="muted">Loading…</p>}
        </div>

        {isMockAuth() && <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><h3>Demo Data</h3></div>
          <p className="muted">Local demo data is stored in your browser. Reset it to restore the seeded users and rides.</p>
          <button
            className="btn btn-outline btn-block"
            onClick={() => { resetDemoData(); window.location.href = '/login'; }}
          >
            Reset demo data
          </button>
        </div>}
      </div>
    </div>
  );
}
