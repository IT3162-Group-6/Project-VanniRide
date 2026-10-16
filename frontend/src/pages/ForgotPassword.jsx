import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { authApi } from '../services/api';

export default function ForgotPassword() {
  const [form, setForm] = useState({
    email: '',
    identityNumber: '',
    securityQuestion: '',
    securityAnswer: '',
  });
  const [questions, setQuestions] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authApi.securityQuestions()
      .then((items) => {
        setQuestions(items);
        setForm((current) => ({
          ...current,
          securityQuestion: current.securityQuestion || items[0]?.id || '',
        }));
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      setMessage(await authApi.forgotPassword(form));
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
        <p>Enter the recovery details configured on your account. Matching requests are sent to an administrator for manual verification.</p>
        {message ? (
          <>
            <div className="alert alert-ok">{message}</div>
            <p className="muted auth-help">Contact an administrator through your usual university channel. After verification, they can provide an expiring one-time reset link. For privacy, this page does not confirm which detail matched.</p>
          </>
        ) : (
          <form onSubmit={submit}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="field">
              <label htmlFor="forgot-email">University email</label>
              <input
                id="forgot-email"
                type="email"
                placeholder="you@stu.vau.ac.lk"
                required
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="forgot-identity">National ID number</label>
              <input
                id="forgot-identity"
                type="text"
                required
                maxLength={12}
                placeholder="12 digits or 9 digits + V/X"
                autoComplete="off"
                value={form.identityNumber}
                onChange={(event) => setForm({ ...form, identityNumber: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="forgot-question">Security question</label>
              <select
                id="forgot-question"
                required
                value={form.securityQuestion}
                onChange={(event) => setForm({ ...form, securityQuestion: event.target.value })}
              >
                {questions.map((question) => <option key={question.id} value={question.id}>{question.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="forgot-answer">Security answer</label>
              <input
                id="forgot-answer"
                type="password"
                required
                minLength={2}
                maxLength={100}
                autoComplete="off"
                value={form.securityAnswer}
                onChange={(event) => setForm({ ...form, securityAnswer: event.target.value })}
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
