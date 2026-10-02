import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppState';
import { ridesApi } from '../../services/api';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [allowance, setAllowance] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });

  useEffect(() => {
    Promise.all([ridesApi.history(), ridesApi.cancellationAllowance()])
      .then(([history, cancellationAllowance]) => {
        setSummary(history.summary);
        setAllowance(cancellationAllowance);
      })
      .catch((requestError) => setError(requestError.message));
  }, [user.id]);

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
            <span>Customer</span>
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
            <button className="btn btn-primary btn-block" type="submit">Save changes</button>
          </form>
        ) : (
          <div className="kv">
            <div><span>Email</span><b>{user.email}</b></div>
            <div><span>Phone</span><b>{user.phone || '—'}</b></div>
            <div><span>Joined</span><b>{user.joined ? new Date(user.joined).toLocaleDateString() : '—'}</b></div>
          </div>
        )}

        <button className="btn btn-ghost btn-block" style={{ marginTop: 18 }} onClick={() => { logout(); navigate('/login'); }}>
          Log out
        </button>
      </div>

      <div>
        <div className="card wallet-card">
          <div className="card-head"><h3>Cancellation Allowance</h3></div>
          <b>{allowance ? `${allowance.remaining} of ${allowance.limit}` : '—'}</b>
          <p className="muted">Available in the rolling one-hour window.</p>
          {allowance?.resetsAt && <p className="muted">Next chance resets at {new Date(allowance.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</p>}
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><h3>Cash Payments</h3></div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="kv">
            <div><span>Paid rides</span><b>{summary?.payments.paid ?? '—'}</b></div>
            <div><span>Pending receipts</span><b>{summary?.payments.pending ?? '—'}</b></div>
            <div><span>Total paid</span><b>LKR {Number(summary?.payments.totalPaidAmount || 0).toFixed(2)}</b></div>
          </div>
        </div>
      </div>
    </div>
  );
}
