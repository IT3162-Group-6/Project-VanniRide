import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../context/authStore';
import { useAppState } from '../context/appStateStore';
import {
  NOTIFICATION_PREFERENCES_EVENT,
  readNotificationPreferences,
  writeNotificationPreferences,
} from '../utils/notificationPreferences';

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
  const { user, logout } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState(() => readNotificationPreferences(user.id));

  const updatePreference = (key, value) => {
    const updated = writeNotificationPreferences(user.id, { ...preferences, [key]: value });
    setPreferences(updated);
    window.dispatchEvent(new CustomEvent(NOTIFICATION_PREFERENCES_EVENT, { detail: updated }));
    showToast('Settings saved on this device');
  };

  const profilePath = `/${user.role}/profile`;

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
        <Link to="/forgot-password"><span><Icon name="shield" /><b>Request password help</b></span><Icon name="back" className="settings-link-arrow" /></Link>
      </section>

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
