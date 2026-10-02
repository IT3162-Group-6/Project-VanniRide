import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import ChatBox from '../../components/ChatBox';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppState';
import { ridesApi, chatApi } from '../../services/api';

export default function Chat() {
  const { user } = useAuth(); const { showToast } = useAppState(); const navigate = useNavigate();
  const [rides, setRides] = useState([]); const [rideId, setRideId] = useState('');
  const [messages, setMessages] = useState([]); const [access, setAccess] = useState(null);
  const [reason, setReason] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const ride = rides.find((item) => item.id === rideId);

  useEffect(() => { ridesApi.history().then((history) => {
    const eligible = history.rides.filter((item) => item.rider && ['accepted','ontheway','picked','completed'].includes(item.status));
    setRides(eligible); setRideId(eligible[0]?.id || '');
  }).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);

  const loadMessages = useCallback(async () => {
    if (!rideId) return;
    try { const result = await chatApi.list(rideId); setMessages(result.messages); setAccess(result.access); setError(''); }
    catch (e) { setError(e.message); }
  }, [rideId]);
  useEffect(() => { const initial=setTimeout(() => void loadMessages(),0); const timer=setInterval(() => void loadMessages(),5000); return()=>{clearTimeout(initial);clearInterval(timer);}; }, [loadMessages]);

  const send = useCallback(async (text) => { try { const message=await chatApi.send(rideId,user.id,text); setMessages((items)=>[...items,message]); } catch(e){setError(e.message);throw e;} }, [rideId,user.id]);
  async function requestAccess(){ if(!reason.trim()){setError('Explain why post-completion contact is needed.');return;} try{const pending=await chatApi.requestAccess(rideId,reason.trim());setAccess((current)=>({...current,pendingRequest:pending}));setReason('');showToast('Permission request sent to the administrator');}catch(e){setError(e.message);} }

  if (loading) return <p className="muted">Loading…</p>;
  if (!ride) return <div className="card"><div className="empty"><div className="fi"><Icon name="chat" /></div><b>No conversation yet</b><p>An assigned active or completed ride will appear here.</p><button className="btn btn-primary" onClick={()=>navigate('/customer/request')}>Request a ride</button></div></div>;
  return <><div className="chat-ride-picker"><label>Conversation</label><select value={rideId} onChange={(e)=>setRideId(e.target.value)}>{rides.map((item)=><option key={item.id} value={item.id}>{item.pickup} → {item.dropoff} ({item.status})</option>)}</select></div>
    {ride.status==='completed' && !access?.canSend && <div className="card chat-access-card"><b>Post-completion contact requires admin permission</b>{access?.pendingRequest ? <p className="muted">Request pending administrator review.</p> : <><div className="field"><label>Reason</label><input value={reason} maxLength={500} onChange={(e)=>setReason(e.target.value)} placeholder="e.g. I left an item in the vehicle"/></div><button className="btn btn-outline btn-sm" onClick={requestAccess}>Request permission</button></>}</div>}
    <ChatBox title={ride.rider.name} subtitle={`${ride.pickup} → ${ride.dropoff}`} initial={ride.rider.name[0]} messages={messages} meId={user.id} onSend={send} disabled={!access?.canSend} error={error}/></>;
}
