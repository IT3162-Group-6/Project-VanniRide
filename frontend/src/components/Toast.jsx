import { useAppState } from '../context/appStateStore';

export default function Toast() {
  const { toastMsg } = useAppState();
  return (
    <div className={`toast ${toastMsg ? 'show' : ''}`}>{toastMsg}</div>
  );
}
