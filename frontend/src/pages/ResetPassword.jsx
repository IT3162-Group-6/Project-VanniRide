import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { authApi } from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await authApi.resetPassword(token, form.password);
      setComplete(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-card">
        <h2>Choose a new password</h2>
        {!token ? (
          <>
            <div className="alert alert-error">This password reset link is invalid.</div>
            <div className="auth-foot"><Link to="/forgot-password">Request another link</Link></div>
          </>
        ) : complete ? (
          <>
            <div className="alert alert-ok">Your password has been reset successfully.</div>
            <Link className="btn btn-primary btn-block" to="/login" replace>Log in with new password</Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <p>Use at least 8 characters. Resetting your password signs out existing sessions.</p>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="field">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                minLength={8}
                maxLength={128}
                required
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                minLength={8}
                maxLength={128}
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
