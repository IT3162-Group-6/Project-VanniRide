import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChatBox from './ChatBox';
import Icon from './Icon';
import { useAuth } from '../context/authStore';
import { useAppState } from '../context/appStateStore';
import { useRealtimeEvent, useRideRoom } from '../context/realtimeHooks';
import {
  CONVERSATION_FILTERS,
  filterConversations,
  isConversationRide,
} from '../data/conversationFilters';
import { chatApi, ridesApi } from '../services/api';

const statusLabel = (status) => {
  if (status === 'ontheway') return 'Arrived';
  if (status === 'picked') return 'Started';
  return status ? `${status[0].toUpperCase()}${status.slice(1)}` : '';
};

const shortDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
};

export default function RideConversations({ role }) {
  const { user } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRideId = useRef(searchParams.get('rideId'));
  const participantKey = role === 'customer' ? 'rider' : 'customer';
  const requestsPath = role === 'customer' ? '/customer/request' : '/rider/requests';

  const [rides, setRides] = useState([]);
  const [rideId, setRideId] = useState('');
  const [filter, setFilter] = useState('all');
  const [messages, setMessages] = useState([]);
  const [access, setAccess] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messageRequest = useRef(0);

  const ride = rides.find((item) => item.id === rideId);
  const visibleRides = useMemo(
    () => filterConversations(rides, filter),
    [rides, filter]
  );

  const loadConversations = useCallback(() => {
    let active = true;
    ridesApi.history()
      .then((history) => {
        if (!active) return;
        const eligible = history.rides.filter((item) =>
          isConversationRide(item, participantKey)
        );
        const requested = eligible.find(
          (item) => item.id === requestedRideId.current
        );
        setRides(eligible);
        setRideId((current) => current && eligible.some((item) => item.id === current)
          ? current
          : requested?.id || eligible[0]?.id || '');
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [participantKey]);

  useEffect(() => loadConversations(), [loadConversations]);

  const loadMessages = useCallback(async () => {
    if (!rideId) return;
    const requestNumber = ++messageRequest.current;
    setMessagesLoading(true);
    try {
      const result = await chatApi.list(rideId);
      if (requestNumber !== messageRequest.current) return;
      setMessages(result.messages);
      setAccess(result.access);
      setError('');
    } catch (requestError) {
      if (requestNumber === messageRequest.current) {
        setError(requestError.message);
      }
    } finally {
      if (requestNumber === messageRequest.current) {
        setMessagesLoading(false);
      }
    }
  }, [rideId]);

  useEffect(() => {
    const initial = setTimeout(() => void loadMessages(), 0);
    const timer = setInterval(() => void loadMessages(), 20000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [loadMessages]);

  useRideRoom(rideId);
  useRealtimeEvent('new_message', (event) => {
    if (event.rideId === rideId) void loadMessages();
  });
  useRealtimeEvent('chat_access_updated', (event) => {
    if (event.rideId === rideId) void loadMessages();
  });
  useRealtimeEvent('ride_status_changed', (event) => {
    if (!rides.some((item) => item.id === event.rideId)) return;
    loadConversations();
    if (event.rideId === rideId) void loadMessages();
  });

  const selectRide = useCallback((nextRideId) => {
    messageRequest.current += 1;
    setRideId(nextRideId);
    setMessages([]);
    setAccess(null);
    setReason('');
    setError('');
    setMessagesLoading(false);
    setSearchParams(nextRideId ? { rideId: nextRideId } : {}, { replace: true });
  }, [setSearchParams]);

  function selectFilter(nextFilter) {
    setFilter(nextFilter);
    const nextRides = filterConversations(rides, nextFilter);
    if (!nextRides.some((item) => item.id === rideId)) {
      selectRide(nextRides[0]?.id || '');
    }
  }

  const send = useCallback(async (text) => {
    try {
      const message = await chatApi.send(rideId, user.id, text);
      setMessages((items) => items.some((item) => item.id === message.id)
        ? items
        : [...items, message]);
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    }
  }, [rideId, user.id]);

  async function requestAccess() {
    if (!reason.trim()) {
      setError('Explain why post-completion contact is needed.');
      return;
    }
    try {
      const pending = await chatApi.requestAccess(rideId, reason.trim());
      setAccess((current) => ({ ...current, pendingRequest: pending }));
      setReason('');
      setError('');
      showToast('Permission request sent to the administrator');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading) return <p className="muted">Loading conversations…</p>;
  if (rides.length === 0) {
    return (
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        <div className="empty">
          <div className="fi"><Icon name="chat" /></div>
          <b>No conversations are available</b>
          <p>
            {role === 'customer'
              ? 'A conversation becomes available after a rider accepts your ride or delivery request.'
              : 'Accept a ride or delivery request first. You can then message that customer here.'}
          </p>
          <button className="btn btn-primary" onClick={() => navigate(requestsPath)}>
            {role === 'customer' ? 'Request a ride' : 'Browse requests'}
          </button>
        </div>
      </div>
    );
  }

  const participant = ride?.[participantKey];
  return (
    <div className="conversation-layout">
      <aside className="conversation-sidebar">
        <div className="conversation-sidebar-head">
          <div>
            <h3>Conversations</h3>
            <span>{rides.length} total</span>
          </div>
          <Icon name="chat" size={20} />
        </div>

        <div className="conversation-filters" role="group" aria-label="Filter conversations">
          {CONVERSATION_FILTERS.map((option) => {
            const count = filterConversations(rides, option.id).length;
            return (
              <button
                type="button"
                key={option.id}
                className={filter === option.id ? 'active' : ''}
                onClick={() => selectFilter(option.id)}
              >
                {option.label} <span>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="conversation-list">
          {visibleRides.map((item) => {
            const person = item[participantKey];
            return (
              <button
                type="button"
                key={item.id}
                className={rideId === item.id ? 'active' : ''}
                onClick={() => selectRide(item.id)}
              >
                <span className="avatar">{person.name?.[0] || '?'}</span>
                <span className="conversation-list-copy">
                  <b>{person.name}</b>
                  <small>{item.pickup} → {item.dropoff}</small>
                  <span>
                    <em className={`conversation-status status-${item.status}`}>
                      {statusLabel(item.status)}
                    </em>
                    <time>{shortDate(item.createdAt)}</time>
                  </span>
                </span>
              </button>
            );
          })}
          {visibleRides.length === 0 && (
            <p className="conversation-list-empty">No conversations match this filter. Choose another filter to see the rest.</p>
          )}
        </div>
      </aside>

      <section className="conversation-main">
        {!ride && (
          <div className="card empty conversation-empty">
            <div className="fi"><Icon name="chat" /></div>
            <b>Select a conversation</b>
            <p>Choose a conversation from the list to open it.</p>
          </div>
        )}

        {ride && ride.status === 'completed' && !access?.canSend && (
          <div className="card chat-access-card">
            <b>Post-completion contact requires admin permission</b>
            {access?.pendingRequest ? (
              <p>Request pending administrator review.</p>
            ) : (
              <>
                <div className="field">
                  <label>Reason</label>
                  <input
                    value={reason}
                    maxLength={500}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="e.g. I left an item in the vehicle"
                  />
                </div>
                <button className="btn btn-outline btn-sm" onClick={requestAccess}>
                  Request permission
                </button>
              </>
            )}
          </div>
        )}

        {ride && ride.status === 'cancelled' && (
          <div className="alert alert-error">
            This cancelled conversation is read-only.
          </div>
        )}

        {ride && participant && (
          <ChatBox
            title={participant.name}
            subtitle={`${ride.pickup} → ${ride.dropoff}`}
            initial={participant.name?.[0]}
            messages={messages}
            meId={user.id}
            onSend={send}
            loading={messagesLoading}
            disabled={!access?.canSend}
            error={error}
          />
        )}
      </section>
    </div>
  );
}
