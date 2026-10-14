import Icon from './Icon';

const ICONS = { cash: 'wallet', wallet: 'wallet', card: 'card' };

/**
 * A single saved payment method. Pass `onSelect` to make it selectable.
 */
export default function PaymentCard({ method, selected = false, onSelect }) {
  return (
    <div
      className={`pay-card ${selected ? 'selected' : ''} ${onSelect ? 'pay-card-link' : ''}`}
      onClick={onSelect ? () => onSelect(method) : undefined}
    >
      <div className="fi"><Icon name={ICONS[method.kind] || 'card'} /></div>
      <div className="pay-meta">
        <b>{method.label}</b>
        <span>{method.detail}</span>
      </div>
      {method.primary && <span className="chip">Primary</span>}
      {selected && <Icon name="check" size={18} />}
    </div>
  );
}
