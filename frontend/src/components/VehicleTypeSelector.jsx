const VEHICLE_TYPES = Object.freeze([
  { value: 'Motorcycle', label: 'Motorcycle', description: 'Bike or scooter' },
  { value: 'Three-wheeler', label: 'Three-wheeler', description: 'Passenger tuk-tuk' },
]);

export default function VehicleTypeSelector({ value, onChange }) {
  return (
    <div className="vehicle-type-grid" role="group" aria-label="Vehicle type">
      {VEHICLE_TYPES.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? 'selected' : ''}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          <b>{option.label}</b>
          <span>{option.description}</span>
        </button>
      ))}
    </div>
  );
}
