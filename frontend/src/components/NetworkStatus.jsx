import { useEffect, useState } from 'react';
import Icon from './Icon';

export default function NetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;
  return (
    <div className="network-banner" role="status" aria-live="polite">
      <Icon name="close" size={16} />
      <span><b>You’re offline.</b> Check your connection before trying again.</span>
    </div>
  );
}
