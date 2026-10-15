import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../context/authStore';
import { useAppState } from '../context/appStateStore';
import AuthShell from '../components/AuthShell';
import VehicleTypeSelector from '../components/VehicleTypeSelector';
import { authApi } from '../services/api';

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
    identityNumber: '',
    securityQuestion: '',
    securityAnswer: '',
    vehicle: { type: 'Motorcycle', model: '', registrationNumber: '', color: '' },
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState([]);

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

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setVehicle = (key) => (e) =>
    setForm({
      ...form,
      vehicle: { ...form.vehicle, [key]: e.target.value },
    });

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
    <AuthShell>
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
            {import.meta.env.DEV && (
              <small className="muted">Testing mode also accepts other valid email addresses.</small>
            )}
          </div>
          <div className="field">
            <label>Phone number</label>
            <input type="tel" placeholder="07X XXX XXXX" required value={form.phone} onChange={set('phone')} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="At least 6 characters" minLength={6} required value={form.password} onChange={set('password')} />
          </div>

          <div className="field">
            <label>University, student, or staff ID number</label>
            <input type="text" maxLength={32} required value={form.identityNumber} onChange={set('identityNumber')} />
            <small className="muted">Used with your security answer when requesting password recovery.</small>
          </div>
          <div className="field">
            <label>Security question</label>
            <select required value={form.securityQuestion} onChange={set('securityQuestion')}>
              {questions.map((question) => <option key={question.id} value={question.id}>{question.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Security answer</label>
            <input type="password" minLength={2} maxLength={100} required autoComplete="off" value={form.securityAnswer} onChange={set('securityAnswer')} />
            <small className="muted">Answers are case-insensitive and are stored securely.</small>
          </div>

          <label className="field-label">I want to join as</label>
          <div className="role-grid">
            {[
              { value: 'customer', title: 'Customer', sub: 'Book rides & deliveries' },
              { value: 'rider', title: 'Rider', sub: 'Earn by riding' },
              { value: 'both', title: 'Both', sub: 'Switch between customer & rider' },
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

          {(form.role === 'rider' || form.role === 'both') && (
            <>
              <div className="field">
                <label>Vehicle type</label>
                <VehicleTypeSelector
                  value={form.vehicle.type}
                  onChange={(type) => setForm({
                    ...form,
                    vehicle: { ...form.vehicle, type },
                  })}
                />
              </div>
              <div className="field">
                <label>Vehicle model</label>
                <input type="text" placeholder="e.g. Honda Dio" required value={form.vehicle.model} onChange={setVehicle('model')} />
              </div>
              <div className="field">
                <label>Registration number</label>
                <input type="text" placeholder="e.g. NP-ABC-1234" required value={form.vehicle.registrationNumber} onChange={setVehicle('registrationNumber')} />
              </div>
              <div className="field">
                <label>Vehicle colour</label>
                <input type="text" placeholder="e.g. Black" required value={form.vehicle.color} onChange={setVehicle('color')} />
              </div>
            </>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <div className="auth-foot">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </AuthShell>
  );
}
