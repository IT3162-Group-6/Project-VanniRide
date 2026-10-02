import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Reusable conversation panel.
 * messages: [{ id, senderId, text, at }]
 * meId:     current user id (decides left/right bubble)
 */
export default function ChatBox({ title, subtitle, initial = '', messages = [], meId, onSend, loading = false, disabled = false, error = '' }) {
  const [text, setText] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  async function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    try {
      await onSend?.(t);
      setText('');
    } catch { /* parent displays the API error */ }
  }

  const avatarChar = initial || title?.[0] || '?';

  return (
    <div className="chat-wrap">
      <div className="chat-head">
        <div className="avatar avatar-online">{avatarChar}</div>
        <div><b>{title}</b><span>{subtitle}</span></div>
        <button className="icon-btn icon-btn-plain" aria-label="More options"><Icon name="list" size={18} /></button>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {loading && <p className="muted" style={{ textAlign: 'center' }}>Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <p className="muted" style={{ textAlign: 'center' }}>No messages yet — say hello 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`msg-line ${mine ? 'mine' : ''}`}>
              {!mine && <span className="msg-avatar">{avatarChar}</span>}
              <div className={`msg ${mine ? 'msg-out' : 'msg-in'}`}>
                {m.text}
                <time>{time(m.at)}{mine && <Icon name="check" size={12} />}</time>
              </div>
            </div>
          );
        })}
      </div>

      <form className="chat-input" onSubmit={submit}>
        {error && <div className="chat-inline-error">{error}</div>}
        <div className="chat-field">
          <input
            type="text"
            placeholder="Type a message..."
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
          />
          <span className="chat-clip"><Icon name="share" size={17} /></span>
        </div>
        <button type="submit" aria-label="Send" disabled={disabled}><Icon name="send" size={18} /></button>
      </form>
    </div>
  );
}
