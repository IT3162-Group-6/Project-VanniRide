import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../context/AppState';

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const deferredPrompt = useRef(null);
  const { showToast } = useAppState();

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      showToast('Vanni Ride installed!');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [showToast]);

  if (!visible) return null;

  return (
    <div className="install-bar">
      <span>Install Vanni Ride on your device for quick access</span>
      <div>
        <button
          className="btn btn-primary btn-sm"
          onClick={async () => {
            setVisible(false);
            if (deferredPrompt.current) {
              deferredPrompt.current.prompt();
              await deferredPrompt.current.userChoice;
              deferredPrompt.current = null;
            }
          }}
        >
          Install
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setVisible(false)}>
          Not now
        </button>
      </div>
    </div>
  );
}
