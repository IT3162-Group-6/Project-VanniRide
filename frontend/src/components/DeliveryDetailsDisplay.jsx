import { DeliveryOrderSummary } from './DeliveryDetailsForm';

export default function DeliveryDetailsDisplay({ ride }) {
  const details = ride?.deliveryDetails;
  if (ride?.type !== 'delivery' || !details) return null;

  const foodNotes = details.foodOrder?.items.filter((item) => item.description) || [];
  const parcelNotes = details.parcelOrder?.notes;

  return (
    <div className="delivery-details-display">
      {ride.deliveryCategory === 'PARCEL' && details.receiverName && (
        <div className="delivery-review-contact">
          <span>Receiver</span>
          <b>{details.receiverName} · {details.receiverPhone}</b>
        </div>
      )}
      {details.foodOrder?.outletName && <div className="delivery-review-contact"><span>Food outlet</span><b>{details.foodOrder.outletName}</b></div>}
      <DeliveryOrderSummary category={ride.deliveryCategory} details={details} compact />
      {foodNotes.map((item, index) => <p key={`${item.foodType}-${index}`} className="fare-note"><b>Item note:</b> {item.description}</p>)}
      {parcelNotes && <p className="fare-note"><b>Parcel note:</b> {parcelNotes}</p>}
    </div>
  );
}
