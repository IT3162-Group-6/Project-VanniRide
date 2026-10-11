export const FOOD_TYPES = Object.freeze([
  { value: 'VEGETABLE_MEAL', label: 'Vegetable meal' },
  { value: 'CHICKEN_MEAL', label: 'Chicken meal' },
  { value: 'SALMON_MEAL', label: 'Salmon meal' },
  { value: 'FISH_MEAL', label: 'Fish meal' },
  { value: 'EGG_MEAL', label: 'Egg meal' },
  { value: 'SAUSAGES_MEAL', label: 'Sausages meal' },
  { value: 'MEATBALL_MEAL', label: 'Meatball meal' },
  { value: 'NOODLES', label: 'Noodles' },
  { value: 'KOTTU', label: 'Kottu' },
  { value: 'PASTA', label: 'Pasta' },
  { value: 'PARATA', label: 'Parata' },
  { value: 'THOSAI', label: 'Thosai' },
  { value: 'OTHER', label: 'Other food' },
]);

export const WATER_TYPES = Object.freeze([
  { value: 'BOTTLE_20L', label: '20L bottle' },
  { value: 'BOTTLE_10L', label: '10L bottle' },
  { value: 'BOTTLE_5L', label: '5L bottle' },
  { value: 'BELOW_5L', label: 'Less than 5L bottle' },
  { value: 'OTHER', label: 'Other water container' },
]);

export const PARCEL_TYPES = Object.freeze([
  { value: 'DOCUMENTS', label: 'Documents' },
  { value: 'FOOD', label: 'Food' },
  { value: 'CLOTHING', label: 'Clothing' },
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'OTHER', label: 'Other parcel' },
]);

export const FOOD_PICKUP_LOCATIONS = Object.freeze([
  { id: 'hostel-canteen', displayName: 'Hostel Canteen', searchQuery: 'Boys Hostel, Pambaimadu' },
  { id: 'rilvan-restaurant', displayName: 'Rilvan Restaurant', searchQuery: 'Rilvan Restaurant, Vavuniya' },
  { id: 'rs-restaurant', displayName: 'RS Restaurant', searchQuery: 'RS Restaurant, Vavuniya' },
  { id: 'army-camp-canteen', displayName: 'Army Camp Canteen', searchQuery: 'Army Camp, Pambaimadu' },
  { id: 'applied-canteen', displayName: 'Applied Canteen', searchQuery: 'Faculty of Applied Science, University of Vavuniya' },
  { id: 'business-studies-canteen', displayName: 'Business Studies Canteen', searchQuery: 'Faculty of Business Studies, University of Vavuniya' },
]);

export const createDefaultDeliveryDetails = () => ({
  receiverName: '',
  receiverPhone: '',
  foodOrder: {
    outletCode: '',
    outletName: '',
    items: [{ foodType: 'VEGETABLE_MEAL', otherName: '', quantity: 1, description: '' }],
  },
  waterOrder: {
    items: [{ containerType: 'BOTTLE_20L', otherDescription: '', quantity: 1 }],
  },
  parcelOrder: {
    parcelType: 'DOCUMENTS',
    otherType: '',
    weightKg: 0.5,
    notes: '',
  },
});

export const getOptionLabel = (options, value) =>
  options.find((option) => option.value === value)?.label || value;

export function validateDeliveryDetails(details, category) {
  if (!details.receiverName.trim()) return 'Enter the receiver name.';
  if (!/^(?:\+94|0)7\d{8}$/.test(details.receiverPhone.replace(/[\s-]/g, ''))) {
    return 'Enter a valid Sri Lankan mobile number for the receiver.';
  }

  if (category === 'FOOD') {
    if (!details.foodOrder.outletName.trim()) return 'Choose or enter the food pickup location.';
    if (details.foodOrder.items.length === 0) return 'Add at least one food item.';
    const invalidOther = details.foodOrder.items.some(
      (item) => item.foodType === 'OTHER' && !item.otherName.trim()
    );
    if (invalidOther) return 'Enter a name for every “Other food” item.';
  }

  if (category === 'WATER') {
    if (details.waterOrder.items.length === 0) return 'Add at least one water item.';
    const invalidOther = details.waterOrder.items.some(
      (item) => item.containerType === 'OTHER' && !item.otherDescription.trim()
    );
    if (invalidOther) return 'Describe every “Other water container” item.';
  }

  if (category === 'PARCEL') {
    if (details.parcelOrder.parcelType === 'OTHER' && !details.parcelOrder.otherType.trim()) {
      return 'Enter the custom parcel type.';
    }
  }

  return '';
}

export function buildDeliveryPayload(details, category) {
  const common = {
    receiverName: details.receiverName.trim(),
    receiverPhone: details.receiverPhone.replace(/[\s-]/g, ''),
  };
  if (category === 'FOOD') return { ...common, foodOrder: details.foodOrder };
  if (category === 'WATER') return { ...common, waterOrder: details.waterOrder };
  return { ...common, parcelOrder: details.parcelOrder };
}
