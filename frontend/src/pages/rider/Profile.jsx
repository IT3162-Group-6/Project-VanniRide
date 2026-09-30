import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppState';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', vehicle: user.vehicle || '' });

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
          <div>
            <b>{user.name}</b>
            <span>{user.rating || 5}★ · Rider</span>
          </div>
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
            <div className="field"><label>Vehicle</label>
              <input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="Honda Dio · NP-1234" />
            </div>
            <button className="btn btn-primary btn-block" type="submit">Save changes</button>
          </form>
        ) : (
          <div className="kv">
            <div><span>Email</span><b>{user.email}</b></div>
            <div><span>Phone</span><b>{user.phone || '—'}</b></div>
            <div><span>Vehicle</span><b>{user.vehicle || '—'}</b></div>
            <div><span>Account status</span><b><StatusBadge status={user.status} /></b></div>
            <div><span>Joined</span><b>{user.joined}</b></div>
          </div>
        )}

        <button className="btn btn-ghost btn-block" style={{ marginTop: 18 }} onClick={() => { logout(); navigate('/login'); }}>
          Log out
        </button>
      </div>

      <div>
        <div className="card wallet-card">
          <div className="card-head"><h3>Total Earnings</h3></div>
          <b>LKR {Number(user.earnings || 0).toLocaleString()}</b>
          <p className="muted" style={{ margin: 0 }}>Payouts are settled weekly.</p>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><h3>Availability</h3></div>
          <div className="pay-card">
            <div className="fi"><Icon name="bike" /></div>
            <div className="pay-meta">
              <b>{user.online ? 'Online' : 'Offline'}</b>
              <span>{user.online ? 'Receiving new requests' : 'Not receiving requests'}</span>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={async () => { await updateUser({ online: !user.online }); showToast(user.online ? "You're offline" : "You're online"); }}
            >
              {user.online ? 'Go offline' : 'Go online'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
