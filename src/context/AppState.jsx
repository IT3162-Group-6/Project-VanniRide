import { createContext, useContext, useState, useCallback, useRef } from 'react';

const AppStateContext = createContext(null);

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

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>');
  return ctx;
}
