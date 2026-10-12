import { useState, useCallback, useRef } from 'react';
import { AppStateContext } from './appStateStore';

export function AppStateProvider({ children }) {
  const [toastMsg, setToastMsg] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  return (
    <AppStateContext.Provider value={{ toastMsg, showToast }}>
      {children}
    </AppStateContext.Provider>
  );
}
