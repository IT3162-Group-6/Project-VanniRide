import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAppState } from '../context/appStateStore';
import {
  isIosDevice,
  isStandaloneMode,
  rememberInstallPromptDismissal,
  wasInstallPromptDismissed,
} from '../utils/pwa';
import Icon from './Icon';

export default function PwaManager() {
  const { showToast } = useAppState();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandaloneMode());
  const [dismissed, setDismissed] = useState(() => wasInstallPromptDismissed());
  const iosInstructions = isIosDevice() && !installed;
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('PWA service worker registration failed', error);
    },
  });

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      showToast('Vanni Ride was installed');
    };
    const displayMode = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayMode = () => setInstalled(isStandaloneMode());

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    displayMode?.addEventListener?.('change', handleDisplayMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      displayMode?.removeEventListener?.('change', handleDisplayMode);
    };
  }, [showToast]);

  useEffect(() => {
    if (!offlineReady) return;
    showToast('Vanni Ride is ready for offline launch');
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, showToast]);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice?.outcome === 'accepted') setInstalled(true);
  }

  function dismissInstall() {
    rememberInstallPromptDismissal();
    setDismissed(true);
  }

  if (needRefresh) {
    return (
      <aside className="pwa-banner" role="status" aria-live="polite">
        <div className="pwa-banner-icon"><Icon name="settings" /></div>
        <div className="pwa-banner-copy">
          <b>Vanni Ride update available</b>
          <span>Update now to use the latest fixes and features.</span>
        </div>
        <div className="pwa-banner-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => updateServiceWorker(true)}>Update</button>
          <button type="button" className="pwa-dismiss" aria-label="Dismiss update" onClick={() => setNeedRefresh(false)}><Icon name="close" size={17} /></button>
        </div>
      </aside>
    );
  }

  if (installed || dismissed || (!installPrompt && !iosInstructions)) return null;

  return (
    <aside className="pwa-banner" role="status" aria-live="polite">
      <div className="pwa-banner-icon"><Icon name="pin" /></div>
      <div className="pwa-banner-copy">
        <b>Install Vanni Ride</b>
        <span>
          {installPrompt
            ? 'Add the app to your phone for quick access and a full-screen experience.'
            : 'On iPhone or iPad, tap Share and then “Add to Home Screen”.'}
        </span>
      </div>
      <div className="pwa-banner-actions">
        {installPrompt && <button type="button" className="btn btn-primary btn-sm" onClick={installApp}>Install</button>}
        <button type="button" className="pwa-dismiss" aria-label="Dismiss install suggestion" onClick={dismissInstall}><Icon name="close" size={17} /></button>
      </div>
    </aside>
  );
}
