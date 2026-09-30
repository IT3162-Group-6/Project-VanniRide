import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../context/AuthContext';
import { useAppState } from '../context/AppState';

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await register(form);
      showToast('Account created — welcome to Vanni Ride!');
      navigate(HOME_BY_ROLE[user.role], { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Create your account</h2>
        <p>Sign up with your university email to get started.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input type="text" placeholder="e.g. Dulani Perera" required value={form.name} onChange={set('name')} />
          </div>
          <div className="field">
            <label>University email</label>
            <input type="email" placeholder="you@vau.ac.lk" required value={form.email} onChange={set('email')} />
          </div>
          <div className="field">
            <label>Phone number</label>
            <input type="tel" placeholder="07X XXX XXXX" value={form.phone} onChange={set('phone')} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="At least 6 characters" minLength={6} required value={form.password} onChange={set('password')} />
          </div>

          <label className="field-label">I want to join as</label>
          <div className="role-grid">
            {[
              { value: 'customer', title: 'Customer', sub: 'Book rides & deliveries' },
              { value: 'rider', title: 'Rider', sub: 'Earn by riding' },
            ].map((r) => (
              <button
                type="button" key={r.value}
                className={`role-opt ${form.role === r.value ? 'selected' : ''}`}
                onClick={() => setForm({ ...form, role: r.value })}
              >
                <b>{r.title}</b><span>{r.sub}</span>
              </button>
            ))}
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <div className="auth-foot">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
