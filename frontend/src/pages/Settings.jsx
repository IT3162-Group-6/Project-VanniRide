import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import VehicleTypeSelector from '../components/VehicleTypeSelector';
import { useAuth } from '../context/authStore';
import { useAppState } from '../context/appStateStore';
import {
  NOTIFICATION_PREFERENCES_EVENT,
  readNotificationPreferences,
  writeNotificationPreferences,
} from '../utils/notificationPreferences';
import { authApi } from '../services/api';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'development';

function SettingSwitch({ label, description, checked, disabled = false, onChange }) {
  return (
    <label className={`settings-switch-row ${disabled ? 'disabled' : ''}`}>
      <span><b>{label}</b><small>{description}</small></span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="settings-switch" aria-hidden="true" />
    </label>
  );
}

export default function Settings() {
  const { user, logout, changePassword, updateRecoverySettings, addRole } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState(() => readNotificationPreferences(user.id));
  const [questions, setQuestions] = useState([]);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [recoveryForm, setRecoveryForm] = useState({ currentPassword: '', identityNumber: '', securityQuestion: '', securityAnswer: '' });
  const [vehicle, setVehicle] = useState({ type: 'Motorcycle', model: '', registrationNumber: '', color: '' });
  const [securityBusy, setSecurityBusy] = useState(false);
  const [roleBusy, setRoleBusy] = useState(false);
  const [accountError, setAccountError] = useState('');

  useEffect(() => {
    if (user.role === 'admin') return;
    authApi.securityQuestions()
      .then((items) => {
        setQuestions(items);
        setRecoveryForm((current) => ({ ...current, securityQuestion: current.securityQuestion || items[0]?.id || '' }));
      })
      .catch((error) => setAccountError(error.message));
  }, [user.role]);

  const updatePreference = (key, value) => {
    const updated = writeNotificationPreferences(user.id, { ...preferences, [key]: value });
    setPreferences(updated);
    window.dispatchEvent(new CustomEvent(NOTIFICATION_PREFERENCES_EVENT, { detail: updated }));
    showToast('Settings saved on this device');
  };

  const profilePath = `/${user.role}/profile`;
  const roles = user.roles || [user.role];
  const missingRole = roles.includes('customer') ? 'rider' : 'customer';

  const submitPassword = async (event) => {
    event.preventDefault();
    setAccountError('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setAccountError('New passwords do not match.');
      return;
    }
    setSecurityBusy(true);
    try {
      const message = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      showToast(message);
      navigate('/login', { replace: true });
    } catch (error) {
      setAccountError(error.message);
    } finally {
      setSecurityBusy(false);
    }
  };

  const submitRecovery = async (event) => {
    event.preventDefault();
    setSecurityBusy(true);
    setAccountError('');
    try {
      await updateRecoverySettings(recoveryForm);
      setRecoveryForm((current) => ({ ...current, currentPassword: '', identityNumber: '', securityAnswer: '' }));
      showToast('Recovery details updated');
    } catch (error) {
      setAccountError(error.message);
    } finally {
      setSecurityBusy(false);
    }
  };

  const enableRole = async (event) => {
    event.preventDefault();
    setRoleBusy(true);
    setAccountError('');
    try {
      const result = await addRole(missingRole, missingRole === 'rider' ? vehicle : undefined);
      showToast(result.message);
    } catch (error) {
      setAccountError(error.message);
    } finally {
      setRoleBusy(false);
    }
  };

  return (
    <div className="settings-grid">
      <section className="card settings-card">
        <div className="settings-card-head">
          <span><Icon name="bell" /></span>
          <div><h3>Notification preferences</h3><p>Choose which optional alerts appear as popups on this device.</p></div>
        </div>
        <SettingSwitch
          label="In-app notification popups"
          description="Master switch for optional popup alerts. Notifications remain available from the bell."
          checked={preferences.popupEnabled}
          onChange={(value) => updatePreference('popupEnabled', value)}
        />
        {user.role === 'rider' && (
          <SettingSwitch
            label="New ride and delivery requests"
            description="Show a popup when a customer creates an available request."
            checked={preferences.rideRequests}
            disabled={!preferences.popupEnabled}
            onChange={(value) => updatePreference('rideRequests', value)}
          />
        )}
        <SettingSwitch
          label="Chat messages"
          description="Show incoming ride and delivery messages as popups."
          checked={preferences.chatMessages}
          disabled={!preferences.popupEnabled}
          onChange={(value) => updatePreference('chatMessages', value)}
        />
        <SettingSwitch
          label="Ride and delivery status"
          description="Show acceptance and progress updates as popups."
          checked={preferences.rideStatus}
          disabled={!preferences.popupEnabled}
          onChange={(value) => updatePreference('rideStatus', value)}
        />
        <div className="settings-critical-note">
          <Icon name="shield" size={18} />
          <span><b>Critical alerts stay enabled</b>Cancellations, account decisions, chat-access decisions, and payment confirmations always appear.</span>
        </div>
      </section>

      <section className="card settings-card">
        <div className="settings-card-head">
          <span><Icon name="settings" /></span>
          <div><h3>Alert feedback</h3><p>Control how popup notifications get your attention.</p></div>
        </div>
        <SettingSwitch
          label="Notification sound"
          description="Play a short sound when a popup appears, when supported by the browser."
          checked={preferences.sound}
          onChange={(value) => updatePreference('sound', value)}
        />
        <SettingSwitch
          label="Vibration"
          description="Vibrate briefly on supported mobile devices."
          checked={preferences.vibration}
          onChange={(value) => updatePreference('vibration', value)}
        />
      </section>

      <section className="card settings-card settings-links-card">
        <div className="settings-card-head">
          <span><Icon name="user" /></span>
          <div><h3>Account and security</h3><p>Manage your profile and account access.</p></div>
        </div>
        <Link to={profilePath}><span><Icon name="user" /><b>Profile</b></span><Icon name="back" className="settings-link-arrow" /></Link>
      </section>

      <section className="card settings-card">
        <div className="settings-card-head">
          <span><Icon name="shield" /></span>
          <div><h3>Change password</h3><p>Confirm your current password before choosing a new one.</p></div>
        </div>
        {accountError && <div className="alert alert-error">{accountError}</div>}
        <form onSubmit={submitPassword} className="settings-form">
          <div className="field"><label>Current password</label><input type="password" required autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /></div>
          <div className="field"><label>New password</label><input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></div>
          <div className="field"><label>Confirm new password</label><input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} /></div>
          <button className="btn btn-primary" type="submit" disabled={securityBusy}>{securityBusy ? 'Saving…' : 'Change password'}</button>
        </form>
      </section>

      {user.role !== 'admin' && (
        <section className="card settings-card">
          <div className="settings-card-head">
            <span><Icon name="shield" /></span>
            <div><h3>Password recovery details</h3><p>These details must match before an administrator receives a reset request.</p></div>
          </div>
          <form onSubmit={submitRecovery} className="settings-form">
            <div className="field"><label>Current password</label><input type="password" required autoComplete="current-password" value={recoveryForm.currentPassword} onChange={(event) => setRecoveryForm({ ...recoveryForm, currentPassword: event.target.value })} /></div>
            <div className="field"><label>University, student, or staff ID number</label><input type="text" required maxLength={32} value={recoveryForm.identityNumber} onChange={(event) => setRecoveryForm({ ...recoveryForm, identityNumber: event.target.value })} /></div>
            <div className="field"><label>Security question</label><select required value={recoveryForm.securityQuestion} onChange={(event) => setRecoveryForm({ ...recoveryForm, securityQuestion: event.target.value })}>{questions.map((question) => <option key={question.id} value={question.id}>{question.label}</option>)}</select></div>
            <div className="field"><label>Security answer</label><input type="password" required minLength={2} maxLength={100} autoComplete="off" value={recoveryForm.securityAnswer} onChange={(event) => setRecoveryForm({ ...recoveryForm, securityAnswer: event.target.value })} /></div>
            <button className="btn btn-primary" type="submit" disabled={securityBusy}>{securityBusy ? 'Saving…' : user.recoveryConfigured ? 'Update recovery details' : 'Set recovery details'}</button>
          </form>
        </section>
      )}

      {user.role !== 'admin' && roles.length < 2 && (
        <section className="card settings-card">
          <div className="settings-card-head">
            <span><Icon name={missingRole === 'rider' ? 'bike' : 'user'} /></span>
            <div><h3>Enable {missingRole} access</h3><p>Use this same email and password for both customer and rider panels.</p></div>
          </div>
          <form onSubmit={enableRole} className="settings-form">
            {missingRole === 'rider' && (
              <>
                <div className="field"><label>Vehicle type</label><VehicleTypeSelector value={vehicle.type} onChange={(type) => setVehicle({ ...vehicle, type })} /></div>
                <div className="field"><label>Vehicle model</label><input required value={vehicle.model} onChange={(event) => setVehicle({ ...vehicle, model: event.target.value })} /></div>
                <div className="field"><label>Registration number</label><input required value={vehicle.registrationNumber} onChange={(event) => setVehicle({ ...vehicle, registrationNumber: event.target.value })} /></div>
                <div className="field"><label>Vehicle colour</label><input required value={vehicle.color} onChange={(event) => setVehicle({ ...vehicle, color: event.target.value })} /></div>
                <p className="muted">Rider access remains pending until an administrator approves the application.</p>
              </>
            )}
            <button className="btn btn-primary" type="submit" disabled={roleBusy}>{roleBusy ? 'Submitting…' : `Enable ${missingRole} access`}</button>
          </form>
        </section>
      )}

      <section className="card settings-card settings-about-card">
        <div className="settings-card-head">
          <span><Icon name="pin" /></span>
          <div><h3>About Vanni Ride</h3><p>Campus transport and delivery application.</p></div>
        </div>
        <div className="settings-version"><span>App version</span><b>{APP_VERSION}</b></div>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => { logout(); navigate('/login', { replace: true }); }}
        >
          <Icon name="logout" size={18} /> Log out
        </button>
      </section>
    </div>
  );
}
