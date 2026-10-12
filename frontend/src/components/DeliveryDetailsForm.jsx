import {
  FOOD_TYPES,
  PARCEL_TYPES,
  WATER_TYPES,
  getOptionLabel,
} from '../data/deliveryOptions';

function QuantityControl({ label, value, onChange, min = 1, max = 20, step = 1 }) {
  const update = (direction) => {
    const next = Math.round((Number(value) + direction * step) * 10) / 10;
    onChange(Math.min(max, Math.max(min, next)));
  };
  return (
    <div className="quantity-control" aria-label={label}>
      <button type="button" onClick={() => update(-1)} disabled={Number(value) <= min} aria-label={`Decrease ${label}`}>−</button>
      <b>{value}{step < 1 ? ' kg' : ''}</b>
      <button type="button" onClick={() => update(1)} disabled={Number(value) >= max} aria-label={`Increase ${label}`}>+</button>
    </div>
  );
}

function ReceiverFields({ details, setDetails }) {
  const update = (key, value) => setDetails((current) => ({ ...current, [key]: value }));
  return (
    <div className="delivery-receiver-grid">
      <div className="field">
        <label>Receiver name</label>
        <input value={details.receiverName} maxLength={100} onChange={(event) => update('receiverName', event.target.value)} placeholder="Person receiving the order" />
      </div>
      <div className="field">
        <label>Receiver phone</label>
        <input type="tel" value={details.receiverPhone} onChange={(event) => update('receiverPhone', event.target.value)} placeholder="077 123 4567" />
      </div>
    </div>
  );
}

function FoodForm({ details, setDetails, pickupLocations = [], onChoosePickup }) {
  const updateOrder = (updater) => setDetails((current) => ({
    ...current,
    foodOrder: updater(current.foodOrder),
  }));
  const updateItem = (index, patch) => updateOrder((order) => ({
    ...order,
    items: order.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  }));
  const addItem = () => updateOrder((order) => ({
    ...order,
    items: [...order.items, { foodType: 'VEGETABLE_MEAL', otherName: '', quantity: 1, description: '' }],
  }));
  const removeItem = (index) => updateOrder((order) => ({
    ...order,
    items: order.items.filter((_, itemIndex) => itemIndex !== index),
  }));

  return (
    <div className="delivery-section">
      <div className="field">
        <label>Food pickup / restaurant</label>
        <input value={details.foodOrder.outletName} maxLength={150} onChange={(event) => updateOrder((order) => ({ ...order, outletCode: '', outletName: event.target.value }))} placeholder="Choose a quick pick or enter the outlet name" />
      </div>
      {pickupLocations.length > 0 && (
        <div className="quick-picks" aria-label="Food pickup locations">
          <span>Food pickup quick picks</span>
          <div>
            {pickupLocations.map((place) => (
              <button type="button" key={place.id} className={details.foodOrder.outletCode === place.id ? 'selected' : ''} onClick={() => onChoosePickup(place)}>
                {place.displayName}
              </button>
            ))}
          </div>
          <small>Confirm the exact pickup point using search or the map.</small>
        </div>
      )}
      <div className="delivery-section-head"><div><b>Food items</b><span>Add each food separately</span></div><button type="button" className="btn btn-outline btn-sm" onClick={addItem}>+ Add food</button></div>
      {details.foodOrder.items.map((item, index) => (
        <div className="delivery-item-card" key={`food-${index}`}>
          <div className="delivery-item-head"><b>Item {index + 1}</b>{details.foodOrder.items.length > 1 && <button type="button" onClick={() => removeItem(index)}>Remove</button>}</div>
          <div className="delivery-item-grid">
            <div className="field"><label>Food type</label><select value={item.foodType} onChange={(event) => updateItem(index, { foodType: event.target.value, otherName: '' })}>{FOOD_TYPES.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>
            <div><label className="field-label">Amount</label><QuantityControl label={`${getOptionLabel(FOOD_TYPES, item.foodType)} quantity`} value={item.quantity} onChange={(quantity) => updateItem(index, { quantity })} /></div>
          </div>
          {item.foodType === 'OTHER' && <div className="field"><label>Food name</label><input value={item.otherName} maxLength={100} onChange={(event) => updateItem(index, { otherName: event.target.value })} placeholder="What should the rider buy?" /></div>}
          <div className="field"><label>Optional description</label><input value={item.description} maxLength={300} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="e.g. less spicy, no gravy" /></div>
        </div>
      ))}
    </div>
  );
}

function WaterForm({ details, setDetails }) {
  const updateOrder = (updater) => setDetails((current) => ({
    ...current,
    waterOrder: updater(current.waterOrder),
  }));
  const updateItem = (index, patch) => updateOrder((order) => ({
    items: order.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  }));
  const addItem = () => updateOrder((order) => ({
    items: [...order.items, { containerType: 'BOTTLE_20L', otherDescription: '', quantity: 1 }],
  }));
  const removeItem = (index) => updateOrder((order) => ({
    items: order.items.filter((_, itemIndex) => itemIndex !== index),
  }));

  return (
    <div className="delivery-section">
      <div className="delivery-section-head"><div><b>Water containers</b><span>Add each bottle size separately</span></div><button type="button" className="btn btn-outline btn-sm" onClick={addItem}>+ Add water</button></div>
      {details.waterOrder.items.map((item, index) => (
        <div className="delivery-item-card" key={`water-${index}`}>
          <div className="delivery-item-head"><b>Item {index + 1}</b>{details.waterOrder.items.length > 1 && <button type="button" onClick={() => removeItem(index)}>Remove</button>}</div>
          <div className="delivery-item-grid">
            <div className="field"><label>Bottle size</label><select value={item.containerType} onChange={(event) => updateItem(index, { containerType: event.target.value, otherDescription: '' })}>{WATER_TYPES.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>
            <div><label className="field-label">Amount</label><QuantityControl label={`${getOptionLabel(WATER_TYPES, item.containerType)} quantity`} value={item.quantity} onChange={(quantity) => updateItem(index, { quantity })} /></div>
          </div>
          {item.containerType === 'OTHER' && <div className="field"><label>Container description</label><input value={item.otherDescription} maxLength={200} onChange={(event) => updateItem(index, { otherDescription: event.target.value })} placeholder="Describe the water container" /></div>}
        </div>
      ))}
    </div>
  );
}

function ParcelForm({ details, setDetails }) {
  const update = (patch) => setDetails((current) => ({
    ...current,
    parcelOrder: { ...current.parcelOrder, ...patch },
  }));
  return (
    <div className="delivery-section delivery-item-card">
      <div className="delivery-item-grid">
        <div className="field"><label>Parcel type</label><select value={details.parcelOrder.parcelType} onChange={(event) => update({ parcelType: event.target.value, otherType: '' })}>{PARCEL_TYPES.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>
        <div><label className="field-label">Rough weight</label><QuantityControl label="parcel weight" value={details.parcelOrder.weightKg} onChange={(weightKg) => update({ weightKg })} min={0.5} max={50} step={0.5} /></div>
      </div>
      {details.parcelOrder.parcelType === 'OTHER' && <div className="field"><label>Parcel type name</label><input value={details.parcelOrder.otherType} maxLength={100} onChange={(event) => update({ otherType: event.target.value })} placeholder="Describe the parcel type" /></div>}
      <div className="field"><label>Additional notes</label><input value={details.parcelOrder.notes} maxLength={500} onChange={(event) => update({ notes: event.target.value })} placeholder="Handling instructions or useful details" /></div>
    </div>
  );
}

export function DeliveryOrderSummary({ category, details, compact = false }) {
  let lines;
  if (category === 'FOOD') {
    lines = details.foodOrder.items.map((item) => ({
      label: item.foodType === 'OTHER' ? item.otherName || 'Other food' : getOptionLabel(FOOD_TYPES, item.foodType),
      quantity: item.quantity,
    }));
  } else if (category === 'WATER') {
    lines = details.waterOrder.items.map((item) => ({
      label: item.containerType === 'OTHER' ? item.otherDescription || 'Other container' : getOptionLabel(WATER_TYPES, item.containerType),
      quantity: item.quantity,
    }));
  } else {
    lines = [{
      label: details.parcelOrder.parcelType === 'OTHER' ? details.parcelOrder.otherType || 'Other parcel' : getOptionLabel(PARCEL_TYPES, details.parcelOrder.parcelType),
      quantity: `${details.parcelOrder.weightKg} kg`,
    }];
  }
  return (
    <div className={`delivery-order-summary ${compact ? 'compact' : ''}`}>
      <b>Order summary</b>
      {lines.map((line, index) => <div key={`${line.label}-${index}`}><span>{line.label}</span><strong>{typeof line.quantity === 'number' ? `× ${line.quantity}` : line.quantity}</strong></div>)}
    </div>
  );
}

export default function DeliveryDetailsForm({
  category,
  details,
  setDetails,
  foodPickupLocations,
  onChooseFoodPickup,
}) {
  return (
    <div className="delivery-details-form">
      <h4>Delivery details</h4>
      {category === 'PARCEL' && <ReceiverFields details={details} setDetails={setDetails} />}
      {category === 'FOOD' && (
        <FoodForm
          details={details}
          setDetails={setDetails}
          pickupLocations={foodPickupLocations}
          onChoosePickup={onChooseFoodPickup}
        />
      )}
      {category === 'WATER' && <WaterForm details={details} setDetails={setDetails} />}
      {category === 'PARCEL' && <ParcelForm details={details} setDetails={setDetails} />}
      <DeliveryOrderSummary category={category} details={details} />
    </div>
  );
}
