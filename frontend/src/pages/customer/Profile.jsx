import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import PaymentCard from '../../components/PaymentCard';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppState';
import { paymentsApi } from '../../services/api';

export default function Profile() {
  const { user, updateUser, logout, refresh } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [methods, setMethods] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', faculty: user.faculty || '' });

  useEffect(() => { paymentsApi.methods(user.id).then(setMethods); }, [user.id]);

  async function save(e) {
    e.preventDefault();
    await updateUser(form);
    setEditing(false);
    showToast('Profile updated');
  }

  async function topUp(amount) {
    await paymentsApi.topUp(user.id, amount);
    await refresh();
    showToast(`LKR ${amount.toFixed(2)} added to your wallet`);
  }

  return (
    <div className="profile-grid">
      <div className="card">
        <div className="profile-head">
          <div className="avatar avatar-lg">{user.name[0]}</div>
          <div>
            <b>{user.name}</b>
            <span>{user.faculty || 'Student'} · Customer</span>
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
            <div className="field"><label>Faculty</label>
              <input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-block" type="submit">Save changes</button>
          </form>
        ) : (
          <div className="kv">
            <div><span>Email</span><b>{user.email}</b></div>
            <div><span>Phone</span><b>{user.phone || '—'}</b></div>
            <div><span>Faculty</span><b>{user.faculty || '—'}</b></div>
            <div><span>Joined</span><b>{user.joined}</b></div>
          </div>
        )}

        <button className="btn btn-ghost btn-block" style={{ marginTop: 18 }} onClick={() => { logout(); navigate('/login'); }}>
          Log out
        </button>
      </div>

      <div>
        <div className="card wallet-card">
          <div className="card-head"><h3>Wallet Balance</h3></div>
          <b>LKR {Number(user.wallet || 0).toFixed(2)}</b>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary btn-block btn-sm" onClick={() => topUp(500)}>+ LKR 500</button>
            <button className="btn btn-outline btn-block btn-sm" onClick={() => topUp(1000)}>+ LKR 1000</button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><h3>Payment Methods</h3></div>
          {methods.map((m) => <PaymentCard key={m.id} method={m} />)}
          {methods.length === 0 && <p className="muted">No saved payment methods.</p>}
        </div>
      </div>
    </div>
  );
}
