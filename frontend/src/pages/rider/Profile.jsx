import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppState';
import { riderApi } from '../../services/api';

export default function Profile() {
  const { user, updateUser, updateRiderVehicle, setRiderAvailability, logout } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const vehicle = user.riderProfile?.vehicle || {};
  const [editing, setEditing] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', vehicle: { type: vehicle.type || '', model: vehicle.model || '', registrationNumber: vehicle.registrationNumber || '', color: vehicle.color || '' } });
  const approved = user.riderProfile?.approvalStatus === 'approved';

  useEffect(() => { riderApi.earnings().then((result) => setEarnings(result.summary)).catch((requestError) => setError(requestError.message)); }, []);
  const setVehicle = (key) => (event) => setForm({ ...form, vehicle: { ...form.vehicle, [key]: event.target.value } });

  async function save(event) {
    event.preventDefault(); setError('');
    try {
      await updateUser({ name: form.name, phone: form.phone });
      const changed = Object.keys(form.vehicle).some((key) => form.vehicle[key] !== (vehicle[key] || ''));
      if (changed) {
        const result = await updateRiderVehicle(form.vehicle);
        showToast(result.reapprovalTriggered ? 'Vehicle updated and sent for reapproval' : 'Vehicle submitted for approval');
      } else showToast('Profile updated');
      setEditing(false);
    } catch (requestError) { setError(requestError.message); }
  }

  async function toggleAvailability() {
    setError('');
    try { await setRiderAvailability(!user.online); showToast(user.online ? "You're offline" : "You're online"); }
    catch (requestError) { setError(requestError.message); }
  }

  return <div className="profile-grid"><div className="card">
    <div className="profile-head"><div className="avatar avatar-lg">{user.name[0]}</div><div><b>{user.name}</b><span>Rider · approval {user.riderProfile?.approvalStatus || 'pending'}</span></div><button className="icon-btn" onClick={() => setEditing((value) => !value)}><Icon name="edit" /></button></div>
    {error && <div className="alert alert-error">{error}</div>}
    {editing ? <form onSubmit={save}>
      <div className="field"><label>Full name</label><input required value={form.name} onChange={(event) => setForm({...form,name:event.target.value})}/></div>
      <div className="field"><label>Phone</label><input required value={form.phone} onChange={(event) => setForm({...form,phone:event.target.value})}/></div>
      <div className="field"><label>Vehicle type</label><input required value={form.vehicle.type} onChange={setVehicle('type')}/></div>
      <div className="field"><label>Vehicle model</label><input required value={form.vehicle.model} onChange={setVehicle('model')}/></div>
      <div className="field"><label>Registration number</label><input required value={form.vehicle.registrationNumber} onChange={setVehicle('registrationNumber')}/></div>
      <div className="field"><label>Colour</label><input required value={form.vehicle.color} onChange={setVehicle('color')}/></div>
      <button className="btn btn-primary btn-block">Save changes</button>
    </form> : <div className="kv"><div><span>Email</span><b>{user.email}</b></div><div><span>Phone</span><b>{user.phone}</b></div><div><span>Vehicle</span><b>{vehicle.model || '—'} · {vehicle.registrationNumber || '—'}</b></div><div><span>Approval</span><b><StatusBadge status={user.riderProfile?.approvalStatus}/></b></div><div><span>Review note</span><b>{user.riderProfile?.reviewReason || '—'}</b></div></div>}
    <button className="btn btn-ghost btn-block" style={{marginTop:18}} onClick={() => { logout(); navigate('/login'); }}>Log out</button>
  </div><div><div className="card wallet-card"><div className="card-head"><h3>Confirmed Earnings</h3></div><b>LKR {Number(earnings?.totalEarnings || 0).toLocaleString()}</b><p className="muted">Pending cash: LKR {Number(earnings?.pendingReceiptAmount || 0).toLocaleString()}</p></div>
    <div className="card" style={{marginTop:18}}><div className="card-head"><h3>Availability</h3></div><div className="pay-card"><div className="fi"><Icon name="bike" /></div><div className="pay-meta"><b>{user.online ? 'Online' : 'Offline'}</b><span>{approved ? (user.online ? 'Receiving requests' : 'Not receiving requests') : 'Requires administrator approval'}</span></div><button className="btn btn-outline btn-sm" disabled={!approved} onClick={toggleAvailability}>{user.online ? 'Go offline' : 'Go online'}</button></div></div>
  </div></div>;
}
