import { useAppState } from '../context/AppState';

export default function Toast() {
  const { toastMsg } = useAppState();
  return (
    <div className={`toast ${toastMsg ? 'show' : ''}`}>{toastMsg}</div>
  );
}
