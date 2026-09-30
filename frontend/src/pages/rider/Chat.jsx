import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import ChatBox from '../../components/ChatBox';
import { useAuth } from '../../context/AuthContext';
import { ridesApi, chatApi } from '../../services/api';

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ridesApi.active({ riderId: user.id }).then(async (r) => {
      setRide(r);
      if (r) setMessages(await chatApi.list(r.id));
      setLoading(false);
    });
  }, [user.id]);

  const send = useCallback(async (text) => {
    const msg = await chatApi.send(ride.id, user.id, text);
    setMessages((m) => [...m, msg]);
  }, [ride, user.id]);

  if (loading) return <p className="muted">Loading…</p>;

  if (!ride) {
    return (
      <div className="card">
        <div className="empty">
          <div className="fi"><Icon name="chat" /></div>
          <b>No conversation yet</b>
          <p>Accept a request to start chatting with the customer.</p>
          <button className="btn btn-primary" onClick={() => navigate('/rider/requests')}>Browse requests</button>
        </div>
      </div>
    );
  }

  return (
    <ChatBox
      title={ride.customer?.name}
      subtitle={`${ride.pickup} → ${ride.dropoff}`}
      initial={ride.customer?.name?.[0]}
      messages={messages}
      meId={user.id}
      onSend={send}
    />
  );
}
