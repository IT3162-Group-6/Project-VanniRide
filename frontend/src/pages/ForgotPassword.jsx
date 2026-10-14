import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { authApi } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      setMessage(await authApi.forgotPassword(email));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-card">
        <h2>Request password help</h2>
        <p>Enter your account email. An administrator will review the request and provide a temporary password.</p>
        {message ? (
          <>
            <div className="alert alert-ok">{message}</div>
            <p className="muted auth-help">Contact an administrator through your usual university channel. For privacy, this page does not confirm whether an account exists.</p>
          </>
        ) : (
          <form onSubmit={submit}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="field">
              <label htmlFor="forgot-email">University email</label>
              <input
                id="forgot-email"
                type="email"
                placeholder="you@vau.ac.lk"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Submitting…' : 'Request password reset'}
            </button>
          </form>
        )}
        <div className="auth-foot"><Link to="/login">Back to login</Link></div>
      </div>
    </AuthShell>
  );
}
