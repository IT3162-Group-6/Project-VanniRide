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
  { id: 'hostel-canteen', displayName: 'Hostel Canteen', latitude: 8.754679431136763, longitude: 80.39997959306534 },
  { id: 'rilvan-restaurant', displayName: 'Rilvan Restaurant', latitude: 8.755848949069371, longitude: 80.3917985440667 },
  { id: 'rs-restaurant', displayName: 'RS Restaurant', latitude: 8.758562832226218, longitude: 80.40602169348837 },
  { id: 'army-camp-canteen', displayName: 'Army Camp Canteen', latitude: 8.75972707146535, longitude: 80.42144188915817 },
  { id: 'applied-canteen', displayName: 'Applied Canteen', latitude: 8.755239886779476, longitude: 80.41010048481681 },
  { id: 'business-studies-canteen', displayName: 'Business Studies Canteen', latitude: 8.756951361634316, longitude: 80.41078483844242 },
]);

export const WATER_PICKUP_LOCATIONS = Object.freeze([
  { id: 'girls-hostel-water', displayName: 'Girls Hostel Water Outlet', latitude: 8.755949051450258, longitude: 80.39949256607096 },
  { id: 'bs-canteen-water', displayName: 'BS Canteen Water Outlet', latitude: 8.756834249378084, longitude: 80.41077647382527 },
]);

export const createDefaultDeliveryDetails = () => ({
  receiverMode: 'SELF',
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
    if (!['SELF', 'OTHER'].includes(details.receiverMode)) {
      return 'Choose who will receive the parcel.';
    }
    if (details.receiverMode === 'OTHER') {
      if (!details.receiverName.trim()) return 'Enter the receiver name.';
      if (!/^(?:\+94|0)7\d{8}$/.test(details.receiverPhone.replace(/[\s-]/g, ''))) {
        return 'Enter a valid Sri Lankan mobile number for the receiver.';
      }
    }
    if (details.parcelOrder.parcelType === 'OTHER' && !details.parcelOrder.otherType.trim()) {
      return 'Enter the custom parcel type.';
    }
  }

  return '';
}

export function buildDeliveryPayload(details, category) {
  if (category === 'FOOD') return { foodOrder: details.foodOrder };
  if (category === 'WATER') return { waterOrder: details.waterOrder };
  return {
    receiverMode: details.receiverMode,
    ...(details.receiverMode === 'OTHER'
      ? {
          receiverName: details.receiverName.trim(),
          receiverPhone: details.receiverPhone.replace(/[\s-]/g, ''),
        }
      : {}),
    parcelOrder: details.parcelOrder,
  };
}
