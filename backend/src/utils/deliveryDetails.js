const AppError = require('./appError');
const {
  FOOD_TYPES,
  PARCEL_TYPES,
  WATER_CONTAINER_TYPES,
} = require('../constants/rideConstants');

const MAX_ITEMS = 20;
const MAX_QUANTITY = 20;

const requiredText = (value, label, maxLength) => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(`${label} is required`, 400);
  if (text.length > maxLength) {
    throw new AppError(`${label} cannot exceed ${maxLength} characters`, 400);
  }
  return text;
};

const optionalText = (value, label, maxLength) => {
  if (value === undefined || value === null || value === '') return null;
  return requiredText(value, label, maxLength);
};

const normalizePhone = (value) => {
  const phone = String(value || '').replace(/[\s-]/g, '');
  if (!/^(?:\+94|0)7\d{8}$/.test(phone)) {
    throw new AppError('Receiver phone must be a valid Sri Lankan mobile number', 400);
  }
  return phone;
};

const normalizeQuantity = (value, label) => {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new AppError(`${label} must be a whole number from 1 to ${MAX_QUANTITY}`, 400);
  }
  return quantity;
};

const normalizeItems = (items, normalizer) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('At least one delivery item is required', 400);
  }
  if (items.length > MAX_ITEMS) {
    throw new AppError(`A delivery cannot contain more than ${MAX_ITEMS} item lines`, 400);
  }
  return items.map(normalizer);
};

const normalizeFoodItem = (item, index) => {
  const number = index + 1;
  const foodType = String(item?.foodType || '').toUpperCase();
  if (!FOOD_TYPES.includes(foodType)) {
    throw new AppError(`Food item ${number} has an invalid food type`, 400);
  }
  const otherName = optionalText(
    item?.otherName,
    `Food item ${number} custom name`,
    100
  );
  if (foodType === 'OTHER' && !otherName) {
    throw new AppError(`Food item ${number} custom name is required`, 400);
  }
  return {
    food_type: foodType,
    other_name: foodType === 'OTHER' ? otherName : null,
    quantity: normalizeQuantity(item?.quantity, `Food item ${number} quantity`),
    description: optionalText(
      item?.description,
      `Food item ${number} description`,
      300
    ),
  };
};

const normalizeWaterItem = (item, index) => {
  const number = index + 1;
  const containerType = String(item?.containerType || '').toUpperCase();
  if (!WATER_CONTAINER_TYPES.includes(containerType)) {
    throw new AppError(`Water item ${number} has an invalid bottle size`, 400);
  }
  const otherDescription = optionalText(
    item?.otherDescription,
    `Water item ${number} description`,
    200
  );
  if (containerType === 'OTHER' && !otherDescription) {
    throw new AppError(`Water item ${number} description is required`, 400);
  }
  return {
    container_type: containerType,
    other_description: containerType === 'OTHER' ? otherDescription : null,
    quantity: normalizeQuantity(item?.quantity, `Water item ${number} quantity`),
  };
};

const normalizeParcelOrder = (value) => {
  if (!value || typeof value !== 'object') {
    throw new AppError('Parcel details are required', 400);
  }
  const parcelType = String(value.parcelType || '').toUpperCase();
  if (!PARCEL_TYPES.includes(parcelType)) {
    throw new AppError('A valid parcel type is required', 400);
  }
  const otherType = optionalText(value.otherType, 'Custom parcel type', 100);
  if (parcelType === 'OTHER' && !otherType) {
    throw new AppError('Custom parcel type is required', 400);
  }
  const weightKg = Number(value.weightKg);
  if (!Number.isFinite(weightKg) || weightKg < 0.1 || weightKg > 50) {
    throw new AppError('Parcel weight must be from 0.1 kg to 50 kg', 400);
  }
  return {
    parcel_type: parcelType,
    other_type: parcelType === 'OTHER' ? otherType : null,
    weight_kg: Math.round(weightKg * 10) / 10,
    notes: optionalText(value.notes, 'Parcel notes', 500),
  };
};

const normalizeDeliveryDetails = (value, category) => {
  if (!value || typeof value !== 'object') {
    throw new AppError('Delivery details are required', 400);
  }

  const expectedOrder = {
    FOOD: 'foodOrder',
    WATER: 'waterOrder',
    PARCEL: 'parcelOrder',
  }[category];
  const suppliedOrders = ['foodOrder', 'waterOrder', 'parcelOrder'].filter(
    (key) => value[key] !== undefined && value[key] !== null
  );
  if (suppliedOrders.length !== 1 || suppliedOrders[0] !== expectedOrder) {
    throw new AppError(
      'Delivery details must contain exactly one order matching the selected category',
      400
    );
  }

  const normalized = {
    receiver_name: requiredText(value.receiverName, 'Receiver name', 100),
    receiver_phone: normalizePhone(value.receiverPhone),
    food_order: null,
    water_order: null,
    parcel_order: null,
  };

  if (category === 'FOOD') {
    normalized.food_order = {
      outlet_code: optionalText(value.foodOrder?.outletCode, 'Food outlet code', 80),
      outlet_name: requiredText(
        value.foodOrder?.outletName,
        'Food outlet name',
        150
      ),
      items: normalizeItems(value.foodOrder?.items, normalizeFoodItem),
    };
  } else if (category === 'WATER') {
    normalized.water_order = {
      items: normalizeItems(value.waterOrder?.items, normalizeWaterItem),
    };
  } else if (category === 'PARCEL') {
    normalized.parcel_order = normalizeParcelOrder(value.parcelOrder);
  }

  return normalized;
};

const serializeDeliveryDetails = (details) => {
  if (!details) return null;
  const value = details.toObject ? details.toObject() : details;
  return {
    receiverName: value.receiver_name,
    receiverPhone: value.receiver_phone,
    foodOrder: value.food_order
      ? {
          outletCode: value.food_order.outlet_code || null,
          outletName: value.food_order.outlet_name,
          items: value.food_order.items.map((item) => ({
            foodType: item.food_type,
            otherName: item.other_name || null,
            quantity: item.quantity,
            description: item.description || null,
          })),
        }
      : null,
    waterOrder: value.water_order
      ? {
          items: value.water_order.items.map((item) => ({
            containerType: item.container_type,
            otherDescription: item.other_description || null,
            quantity: item.quantity,
          })),
        }
      : null,
    parcelOrder: value.parcel_order
      ? {
          parcelType: value.parcel_order.parcel_type,
          otherType: value.parcel_order.other_type || null,
          weightKg: value.parcel_order.weight_kg,
          notes: value.parcel_order.notes || null,
        }
      : null,
  };
};

module.exports = { normalizeDeliveryDetails, serializeDeliveryDetails };
