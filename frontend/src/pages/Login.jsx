import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../context/AuthContext';
import { useAppState } from '../context/AppState';
import { isMockAuth } from '../services/api';

const DEMO = [
  { role: 'Customer', email: 'customer@vau.ac.lk' },
  { role: 'Rider', email: 'rider@vau.ac.lk' },
  { role: 'Admin', email: 'admin@vau.ac.lk' },
];

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form);
      showToast(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(location.state?.from || HOME_BY_ROLE[user.role], { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Welcome back</h2>
        <p>Log in with your university email to continue.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>University email</label>
            <input
              type="email" placeholder="you@vau.ac.lk" required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password" placeholder="••••••••" required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        {isMockAuth() && (
          <div className="demo-box">
            <b>Demo accounts</b>
            <span>Password for all: <code>123456</code></span>
            <div className="demo-list">
              {DEMO.map((d) => (
                <button
                  key={d.email} type="button" className="chip chip-btn"
                  onClick={() => setForm({ email: d.email, password: '123456' })}
                >
                  {d.role}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="auth-foot">
          New here? <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
