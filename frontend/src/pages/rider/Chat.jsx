import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import ChatBox from '../../components/ChatBox';
import { useAuth } from '../../context/AuthContext';
import { ridesApi, chatApi } from '../../services/api';

export default function Chat() {
  const { user }=useAuth(); const navigate=useNavigate();
  const [rides,setRides]=useState([]); const [rideId,setRideId]=useState(''); const [messages,setMessages]=useState([]); const [access,setAccess]=useState(null); const [error,setError]=useState(''); const [loading,setLoading]=useState(true);
  const ride=rides.find((item)=>item.id===rideId);
  useEffect(()=>{ridesApi.history().then((history)=>{const eligible=history.rides.filter((item)=>item.customer&&['accepted','ontheway','picked','completed'].includes(item.status));setRides(eligible);setRideId(eligible[0]?.id||'');}).catch((e)=>setError(e.message)).finally(()=>setLoading(false));},[]);
  const load=useCallback(async()=>{if(!rideId)return;try{const result=await chatApi.list(rideId);setMessages(result.messages);setAccess(result.access);setError('');}catch(e){setError(e.message);}},[rideId]);
  useEffect(()=>{const initial=setTimeout(()=>void load(),0);const timer=setInterval(()=>void load(),5000);return()=>{clearTimeout(initial);clearInterval(timer);};},[load]);
  const send=useCallback(async(text)=>{try{const message=await chatApi.send(rideId,user.id,text);setMessages((items)=>[...items,message]);}catch(e){setError(e.message);throw e;}},[rideId,user.id]);
  if(loading)return <p className="muted">Loading…</p>;
  if(!ride)return <div className="card"><div className="empty"><div className="fi"><Icon name="chat" /></div><b>No conversation yet</b><p>Accept a request to chat with a customer.</p><button className="btn btn-primary" onClick={()=>navigate('/rider/requests')}>Browse requests</button></div></div>;
  return <><div className="chat-ride-picker"><label>Conversation</label><select value={rideId} onChange={(e)=>setRideId(e.target.value)}>{rides.map((item)=><option key={item.id} value={item.id}>{item.pickup} → {item.dropoff} ({item.status})</option>)}</select></div>{ride.status==='completed'&&!access?.canSend&&<div className="alert alert-error">This completed conversation is read-only until an administrator approves the customer's contact request.</div>}<ChatBox title={ride.customer.name} subtitle={`${ride.pickup} → ${ride.dropoff}`} initial={ride.customer.name[0]} messages={messages} meId={user.id} onSend={send} disabled={!access?.canSend} error={error}/></>;
}
