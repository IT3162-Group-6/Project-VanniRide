/* ============================================================
   services/api.js
   Single place for all data access.

   Authentication uses the real backend by default. The remaining
   screen adapters stay on the local demo store until their integration
   phases are completed, and can be switched independently with Vite env.
   ============================================================ */

const USE_MOCK_AUTH = import.meta.env?.VITE_USE_MOCK_AUTH === 'true';
const USE_MOCK_DATA = import.meta.env?.VITE_USE_MOCK_DATA !== 'false';
const BASE_URL = String(
  import.meta.env?.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/$/, '');

const TOKEN_KEY = 'vr_token';
const DB_KEY = 'vr_db';

export const RIDE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  ONTHEWAY: 'ontheway',
  PICKED: 'picked',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/* ---------------- token helpers ---------------- */
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));
export const isMockAuth = () => USE_MOCK_AUTH;

/* ---------------- shared real HTTP client ---------------- */
export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function http(path, { method = 'GET', body, params, signal } = {}) {
  const url = new URL(BASE_URL + path);
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const token = getToken();
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('Unable to connect to the Vanni Ride server. Please try again.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      data?.message || `Request failed (${res.status})`,
      res.status,
      data
    );
  }
  return data;
}

const normalizeRiderProfile = (profile) =>
  profile
    ? {
        ...profile,
        approvalStatus: String(profile.approvalStatus || 'PENDING').toLowerCase(),
        availabilityStatus: String(
          profile.availabilityStatus || 'UNAVAILABLE'
        ).toLowerCase(),
      }
    : null;

const normalizeApiUser = (user, riderProfile = null) => {
  if (!user) return null;
  const normalizedRider = normalizeRiderProfile(riderProfile);
  const vehicle = normalizedRider?.vehicle;
  return {
    ...user,
    role: String(user.role || '').toLowerCase(),
    status: String(user.accountStatus || user.status || '').toLowerCase(),
    joined: user.createdAt || user.joined || null,
    riderProfile: normalizedRider,
    vehicle: vehicle
      ? `${vehicle.model} · ${vehicle.registrationNumber}`
      : user.vehicle,
    online: normalizedRider
      ? normalizedRider.availabilityStatus === 'available'
      : user.online,
  };
};

const FRONTEND_RIDE_STATUS = Object.freeze({
  REQUESTED: RIDE_STATUS.PENDING,
  ACCEPTED: RIDE_STATUS.ACCEPTED,
  ARRIVED: RIDE_STATUS.ONTHEWAY,
  STARTED: RIDE_STATUS.PICKED,
  COMPLETED: RIDE_STATUS.COMPLETED,
  CANCELLED: RIDE_STATUS.CANCELLED,
});

const normalizeApiRide = (ride) =>
  ride
    ? {
        ...ride,
        apiStatus: ride.status,
        status: FRONTEND_RIDE_STATUS[ride.status] || String(ride.status).toLowerCase(),
        type: ride.rideType === 'DELIVERY' ? 'delivery' : 'ride',
        pickup: ride.pickupLocation?.address || '',
        dropoff: ride.destination?.address || '',
        fare: ride.estimatedFare,
        createdAt: ride.requestedAt,
        rider: ride.assignedRider || null,
      }
    : null;

const normalizeHistoryItem = (item) => ({
  ...normalizeApiRide(item.ride),
  rider: item.participant || null,
  customer: item.participant || null,
  participant: item.participant || null,
  payment: item.payment
    ? {
        ...item.payment,
        method: String(item.payment.paymentMethod || '').toLowerCase(),
        status: String(item.payment.paymentStatus || '').toLowerCase(),
      }
    : null,
  cancellation: item.cancellation || null,
  rating: item.rating || null,
});

/* ---------------- mock store ---------------- */
const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms));
const uid = (p) => p + Math.random().toString(36).slice(2, 8);

const seed = () => ({
  users: [
    { id: 'u1', name: 'Dulani Perera', email: 'customer@vau.ac.lk', password: '123456', role: 'customer', phone: '077 123 4567', faculty: 'Science Faculty', wallet: 1250, joined: '2026-01-12', status: 'active' },
    { id: 'u2', name: 'Nimesh Kavinda', email: 'rider@vau.ac.lk', password: '123456', role: 'rider', phone: '071 998 2210', vehicle: 'Yamaha Ray · WP-1234', rating: 4.9, earnings: 18450, online: true, joined: '2025-11-02', status: 'active' },
    { id: 'u3', name: 'System Admin', email: 'admin@vau.ac.lk', password: '123456', role: 'admin', phone: '070 000 0000', joined: '2025-09-01', status: 'active' },
    { id: 'u4', name: 'Kavith Silva', email: 'kavith@vau.ac.lk', password: '123456', role: 'customer', phone: '076 441 2098', faculty: 'Business Studies', wallet: 430, joined: '2026-02-20', status: 'active' },
    { id: 'u5', name: 'Tharushi Fernando', email: 'tharushi@vau.ac.lk', password: '123456', role: 'rider', phone: '075 220 3311', vehicle: 'Honda Dio · NP-7788', rating: 4.7, earnings: 9120, online: false, joined: '2026-03-05', status: 'pending' },
  ],
  rides: [
    { id: 'r1', code: 'VR-1041', customerId: 'u1', riderId: 'u2', type: 'ride', pickup: 'Science Faculty', dropoff: 'Vavuniya Town', via: '', status: 'ontheway', fare: 324, distanceKm: 10.2, etaMin: 21, payment: 'wallet', createdAt: '2026-09-15T10:15:00', note: '' },
    { id: 'r2', code: 'VR-1039', customerId: 'u1', riderId: 'u2', type: 'delivery', pickup: 'Main Gate', dropoff: 'Hostel A', via: '', status: 'completed', fare: 180, distanceKm: 3.4, etaMin: 9, payment: 'cash', createdAt: '2026-09-12T11:45:00', rating: 5, note: 'Medicine parcel' },
    { id: 'r3', code: 'VR-1035', customerId: 'u4', riderId: null, type: 'ride', pickup: 'Library Junction', dropoff: 'Bus Stand', via: '', status: 'pending', fare: 210, distanceKm: 5.1, etaMin: 12, payment: 'cash', createdAt: '2026-09-15T09:05:00', note: '' },
    { id: 'r4', code: 'VR-1030', customerId: 'u4', riderId: 'u5', type: 'ride', pickup: 'Hostel A', dropoff: 'Hospital', via: '', status: 'cancelled', fare: 150, distanceKm: 4.0, etaMin: 11, payment: 'cash', createdAt: '2026-09-10T19:20:00', note: '' },
    { id: 'r5', code: 'VR-1028', customerId: 'u1', riderId: 'u5', type: 'ride', pickup: 'Science Faculty', dropoff: 'Hostel A', via: '', status: 'completed', fare: 160, distanceKm: 3.8, etaMin: 10, payment: 'wallet', createdAt: '2026-09-08T08:30:00', rating: 4, note: '' },
    { id: 'r6', code: 'VR-1044', customerId: 'u1', riderId: null, type: 'delivery', pickup: 'Vavuniya Town', dropoff: 'Science Faculty', via: '', status: 'pending', fare: 260, distanceKm: 7.4, etaMin: 16, payment: 'cash', createdAt: '2026-09-15T08:40:00', note: 'Groceries, 2 bags' },
  ],
  messages: [
    { id: 'm1', rideId: 'r1', senderId: 'u2', text: "Hi! I'm on the way to your pickup location.", at: '2026-09-15T10:20:00' },
    { id: 'm2', rideId: 'r1', senderId: 'u1', text: "Okay, I'll be waiting at the main gate.", at: '2026-09-15T10:21:00' },
    { id: 'm3', rideId: 'r1', senderId: 'u2', text: 'Great, see you in 5 minutes.', at: '2026-09-15T10:22:00' },
  ],
  payments: [
    { id: 'p1', userId: 'u1', kind: 'cash', label: 'Cash', detail: 'Default method', primary: true },
    { id: 'p2', userId: 'u1', kind: 'wallet', label: 'Vanni Wallet', detail: 'Campus wallet', primary: false },
    { id: 'p3', userId: 'u1', kind: 'card', label: 'Visa •••• 4242', detail: 'Expires 09/28', primary: false },
  ],
});

function db() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) { try { return JSON.parse(raw); } catch { /* fall through */ } }
  const fresh = seed();
  localStorage.setItem(DB_KEY, JSON.stringify(fresh));
  return fresh;
}
function save(next) { localStorage.setItem(DB_KEY, JSON.stringify(next)); return next; }
export function resetDemoData() { localStorage.removeItem(DB_KEY); localStorage.removeItem(TOKEN_KEY); }

const publicUser = (u) => { if (!u) return null; const { password: _pw, ...rest } = u; return rest; };

function hydrate(ride, d) {
  const c = d.users.find((u) => u.id === ride.customerId);
  const r = d.users.find((u) => u.id === ride.riderId);
  return { ...ride, customer: publicUser(c), rider: publicUser(r) };
}

/* ---------------- fare ---------------- */
export const FARE_RULES = { base: 100, perKm: 20, demand: 20 };
export function estimateFare(distanceKm) {
  const distanceCost = Math.round(FARE_RULES.perKm * distanceKm);
  return {
    base: FARE_RULES.base,
    distanceCost,
    demand: FARE_RULES.demand,
    total: FARE_RULES.base + distanceCost + FARE_RULES.demand,
  };
}

/* ============================================================
   MAP SEARCH / ROUTING
   ============================================================ */
export const mapApi = {
  async search(query) {
    const response = await http('/maps/search', { params: { q: query } });
    return response.data?.places || [];
  },

  async reverse(latitude, longitude) {
    const response = await http('/maps/reverse', {
      params: { latitude, longitude },
    });
    return response.data?.place || null;
  },

  async previewRoute(payload) {
    const response = await http('/maps/route-preview', {
      method: 'POST',
      body: payload,
    });
    return response.data?.routePreview;
  },
};

/* ============================================================
   AUTH
   ============================================================ */
export const authApi = {
  async login({ email, password }) {
    if (!USE_MOCK_AUTH) {
      const response = await http('/auth/login', {
        method: 'POST',
        body: { email: String(email).trim(), password },
      });
      setToken(response.token);
      const riderProfile = normalizeRiderProfile(response.data?.riderProfile);
      return {
        token: response.token,
        riderProfile,
        user: normalizeApiUser(response.data?.user, riderProfile),
      };
    }
    await delay();
    const d = db();
    const user = d.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password);
    if (!user) throw new Error('Invalid email or password');
    setToken(`mock.${user.id}`);
    return { user: publicUser(user), token: getToken() };
  },

  async register({ name, email, password, role = 'customer', phone = '', vehicle }) {
    if (!USE_MOCK_AUTH) {
      const response = await http('/auth/register', {
        method: 'POST',
        body: {
          name: String(name).trim(),
          email: String(email).trim(),
          phone: String(phone).trim(),
          password,
          role: String(role).toUpperCase(),
          ...(String(role).toLowerCase() === 'rider' ? { vehicle } : {}),
        },
      });
      setToken(response.token);
      const riderProfile = normalizeRiderProfile(response.data?.riderProfile);
      return {
        token: response.token,
        riderProfile,
        user: normalizeApiUser(response.data?.user, riderProfile),
      };
    }
    await delay();
    const d = db();
    if (d.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      throw new Error('An account with that email already exists');
    }
    const user = {
      id: uid('u'), name, email, password, role, phone,
      wallet: role === 'customer' ? 0 : undefined,
      earnings: role === 'rider' ? 0 : undefined,
      rating: role === 'rider' ? 5 : undefined,
      online: role === 'rider' ? false : undefined,
      joined: new Date().toISOString().slice(0, 10),
      status: role === 'rider' ? 'pending' : 'active',
    };
    d.users.push(user);
    save(d);
    setToken(`mock.${user.id}`);
    return { user: publicUser(user), token: getToken() };
  },

  async me() {
    if (!USE_MOCK_AUTH) {
      if (!getToken()) return null;
      try {
        const response = await http('/users/profile');
        return normalizeApiUser(
          response.data?.user,
          response.data?.riderProfile
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setToken(null);
          return null;
        }
        throw error;
      }
    }
    const t = getToken();
    if (!t) return null;
    const d = db();
    return publicUser(d.users.find((u) => u.id === t.replace('mock.', ''))) || null;
  },

  async updateProfile(userId, patch) {
    if (!USE_MOCK_AUTH) {
      const body = {};
      if (patch.name !== undefined) body.name = patch.name;
      if (patch.phone !== undefined) body.phone = patch.phone;
      const response = await http('/users/profile', {
        method: 'PUT',
        body,
      });
      return normalizeApiUser(response.data?.user);
    }
    await delay(180);
    const d = db();
    const u = d.users.find((x) => x.id === userId);
    Object.assign(u, patch);
    save(d);
    return publicUser(u);
  },

  async logout() {
    if (USE_MOCK_AUTH) {
      setToken(null);
      return;
    }
    try {
      if (getToken()) await http('/auth/logout', { method: 'POST' });
    } finally {
      setToken(null);
    }
  },
};

export const riderApi = {
  async setAvailability(available) {
    const response = await http('/users/rider/availability', {
      method: 'PATCH',
      body: { availabilityStatus: available ? 'AVAILABLE' : 'UNAVAILABLE' },
    });
    return normalizeRiderProfile(response.data?.riderProfile);
  },

  async updateVehicle(vehicle) {
    const response = await http('/users/rider/profile', {
      method: 'PUT',
      body: { vehicle },
    });
    return {
      riderProfile: normalizeRiderProfile(response.data?.riderProfile),
      reapprovalTriggered: Boolean(response.data?.reapprovalTriggered),
    };
  },

  async earnings() {
    const response = await http('/users/rider/earnings');
    return {
      summary: response.data?.summary || null,
      earnings: response.data?.earnings || [],
    };
  },
};

/* ============================================================
   RIDES
   ============================================================ */
export const ridesApi = {
  async list({ customerId, riderId, status, available } = {}) {
    if (!USE_MOCK_AUTH && customerId) {
      const response = await http('/rides');
      let rides = (response.data?.rides || []).map(normalizeApiRide);
      if (status) rides = rides.filter((ride) => ride.status === status);
      return rides;
    }
    if (!USE_MOCK_AUTH && (riderId || available)) {
      const response = await http(available ? '/rides/available' : '/rides');
      let rides = (response.data?.rides || []).map(normalizeApiRide);
      if (status) rides = rides.filter((ride) => ride.status === status);
      return rides;
    }
    if (!USE_MOCK_DATA) return http('/rides', { params: { customerId, riderId, status, available } });
    await delay(200);
    const d = db();
    let out = d.rides.slice();
    if (customerId) out = out.filter((r) => r.customerId === customerId);
    if (riderId) out = out.filter((r) => r.riderId === riderId);
    if (available) out = out.filter((r) => r.status === RIDE_STATUS.PENDING && !r.riderId);
    if (status) out = out.filter((r) => r.status === status);
    return out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((r) => hydrate(r, d));
  },

  async get(id) {
    if (!USE_MOCK_AUTH) {
      const response = await http(`/rides/${id}`);
      return normalizeApiRide(response.data?.ride);
    }
    if (!USE_MOCK_DATA) return http(`/rides/${id}`);
    await delay(150);
    const d = db();
    const ride = d.rides.find((r) => r.id === id);
    if (!ride) throw new Error('Ride not found');
    return hydrate(ride, d);
  },

  async active({ customerId, riderId }) {
    const live = [RIDE_STATUS.PENDING, RIDE_STATUS.ACCEPTED, RIDE_STATUS.ONTHEWAY, RIDE_STATUS.PICKED];
    const list = await ridesApi.list({ customerId, riderId });
    return list.find((r) => live.includes(r.status)) || null;
  },

  async create(payload) {
    if (!USE_MOCK_AUTH) {
      const response = await http('/rides', { method: 'POST', body: payload });
      return normalizeApiRide(response.data?.ride);
    }
    if (!USE_MOCK_DATA) return http('/rides', { method: 'POST', body: payload });
    await delay();
    const d = db();
    const ride = {
      id: uid('r'),
      code: 'VR-' + Math.floor(1000 + Math.random() * 9000),
      riderId: null,
      status: RIDE_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      ...payload,
    };
    d.rides.push(ride);
    save(d);
    return hydrate(ride, d);
  },

  async accept(rideId, riderId) {
    if (!USE_MOCK_AUTH) {
      const response = await http(`/rides/${rideId}/accept`, { method: 'PATCH' });
      return normalizeApiRide(response.data?.ride);
    }
    if (!USE_MOCK_DATA) return http(`/rides/${rideId}/accept`, { method: 'POST', body: { riderId } });
    await delay();
    const d = db();
    const ride = d.rides.find((r) => r.id === rideId);
    if (!ride) throw new Error('Ride not found');
    if (ride.riderId) throw new Error('This request was already taken');
    ride.riderId = riderId;
    ride.status = RIDE_STATUS.ACCEPTED;
    save(d);
    return hydrate(ride, d);
  },

  async updateStatus(rideId, status) {
    if (!USE_MOCK_AUTH) {
      const backendStatus = {
        [RIDE_STATUS.ONTHEWAY]: 'ARRIVED',
        [RIDE_STATUS.PICKED]: 'STARTED',
        [RIDE_STATUS.COMPLETED]: 'COMPLETED',
      }[status] || String(status).toUpperCase();
      const response = await http(`/rides/${rideId}/status`, {
        method: 'PATCH',
        body: { status: backendStatus },
      });
      return normalizeApiRide(response.data?.ride);
    }
    if (!USE_MOCK_DATA) return http(`/rides/${rideId}/status`, { method: 'PATCH', body: { status } });
    await delay(180);
    const d = db();
    const ride = d.rides.find((r) => r.id === rideId);
    ride.status = status;
    if (status === RIDE_STATUS.COMPLETED) {
      const rider = d.users.find((u) => u.id === ride.riderId);
      if (rider) rider.earnings = (rider.earnings || 0) + ride.fare;
      const cust = d.users.find((u) => u.id === ride.customerId);
      if (cust && ride.payment === 'wallet') cust.wallet = Math.max(0, (cust.wallet || 0) - ride.fare);
    }
    save(d);
    return hydrate(ride, d);
  },

  async cancel(rideId) { return ridesApi.updateStatus(rideId, RIDE_STATUS.CANCELLED); },

  async cancelWithReason(rideId, reason) {
    const response = await http(`/rides/${rideId}/cancel`, {
      method: 'PATCH',
      body: { reason },
    });
    return {
      ride: normalizeApiRide(response.data?.ride),
      cancellationRequest: response.data?.cancellationRequest || null,
      cancellationAllowance: response.data?.cancellationAllowance || null,
      pendingConfirmation: Boolean(response.data?.cancellationRequest),
      message: response.message,
    };
  },

  async getCancellationRequest(rideId) {
    try {
      const response = await http(`/rides/${rideId}/cancellation-request`);
      return response.data?.cancellationRequest || null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  async respondToCancellation(rideId, decision) {
    const response = await http(`/rides/${rideId}/cancellation-request`, {
      method: 'PATCH',
      body: { decision },
    });
    return {
      ride: normalizeApiRide(response.data?.ride),
      cancellationRequest: response.data?.cancellationRequest || null,
      cancellationAllowance: response.data?.cancellationAllowance || null,
      message: response.message,
    };
  },

  async history() {
    const response = await http('/users/history');
    return {
      summary: response.data?.summary || null,
      rides: (response.data?.history || []).map(normalizeHistoryItem),
    };
  },

  async cancellationAllowance() {
    const response = await http('/users/cancellation-allowance');
    return response.data?.cancellationAllowance || null;
  },

  async payment(rideId) {
    const response = await http(`/rides/${rideId}/payment`);
    const payment = response.data?.payment;
    return payment
      ? {
          ...payment,
          method: String(payment.paymentMethod || '').toLowerCase(),
          status: String(payment.paymentStatus || '').toLowerCase(),
        }
      : null;
  },

  async confirmCashPayment(rideId) {
    const response = await http(`/rides/${rideId}/payment`, { method: 'PATCH' });
    const payment = response.data?.payment;
    return payment
      ? { ...payment, method: 'cash', status: String(payment.paymentStatus).toLowerCase() }
      : null;
  },

  async rate(rideId, rating) {
    if (!USE_MOCK_DATA) return http(`/rides/${rideId}/rate`, { method: 'POST', body: { rating } });
    await delay(150);
    const d = db();
    const ride = d.rides.find((r) => r.id === rideId);
    ride.rating = rating;
    save(d);
    return hydrate(ride, d);
  },
};

/* ============================================================
   CHAT
   ============================================================ */
export const chatApi = {
  async list(rideId) {
    if (!USE_MOCK_DATA) return http(`/rides/${rideId}/messages`);
    await delay(120);
    return db().messages.filter((m) => m.rideId === rideId);
  },
  async send(rideId, senderId, text) {
    if (!USE_MOCK_DATA) return http(`/rides/${rideId}/messages`, { method: 'POST', body: { senderId, text } });
    await delay(100);
    const d = db();
    const msg = { id: uid('m'), rideId, senderId, text, at: new Date().toISOString() };
    d.messages.push(msg);
    save(d);
    return msg;
  },
};

/* ============================================================
   PAYMENTS / WALLET
   ============================================================ */
export const paymentsApi = {
  async methods(userId) {
    if (!USE_MOCK_DATA) return http('/payments/methods', { params: { userId } });
    await delay(150);
    return db().payments.filter((p) => p.userId === userId);
  },
  async topUp(userId, amount) {
    if (!USE_MOCK_DATA) return http('/payments/topup', { method: 'POST', body: { userId, amount } });
    await delay();
    const d = db();
    const u = d.users.find((x) => x.id === userId);
    u.wallet = (u.wallet || 0) + amount;
    save(d);
    return publicUser(u);
  },
  async setPrimary(userId, methodId) {
    if (!USE_MOCK_DATA) return http(`/payments/methods/${methodId}/primary`, { method: 'POST' });
    await delay(120);
    const d = db();
    d.payments.filter((p) => p.userId === userId).forEach((p) => { p.primary = p.id === methodId; });
    save(d);
    return d.payments.filter((p) => p.userId === userId);
  },
};

/* ============================================================
   ADMIN
   ============================================================ */
export const adminApi = {
  async users(role) {
    if (!USE_MOCK_DATA) return http('/admin/users', { params: { role } });
    await delay(180);
    const list = db().users.map(publicUser);
    return role ? list.filter((u) => u.role === role) : list;
  },
  async setUserStatus(userId, status) {
    if (!USE_MOCK_DATA) return http(`/admin/users/${userId}/status`, { method: 'PATCH', body: { status } });
    await delay(150);
    const d = db();
    const u = d.users.find((x) => x.id === userId);
    u.status = status;
    save(d);
    return publicUser(u);
  },
  async rides() {
    if (!USE_MOCK_DATA) return http('/admin/rides');
    await delay(180);
    const d = db();
    return d.rides.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((r) => hydrate(r, d));
  },
  async stats() {
    if (!USE_MOCK_DATA) return http('/admin/stats');
    await delay(180);
    const d = db();
    const completed = d.rides.filter((r) => r.status === RIDE_STATUS.COMPLETED);
    return {
      customers: d.users.filter((u) => u.role === 'customer').length,
      riders: d.users.filter((u) => u.role === 'rider').length,
      pendingRiders: d.users.filter((u) => u.role === 'rider' && u.status === 'pending').length,
      totalRides: d.rides.length,
      activeRides: d.rides.filter((r) => [RIDE_STATUS.PENDING, RIDE_STATUS.ACCEPTED, RIDE_STATUS.ONTHEWAY, RIDE_STATUS.PICKED].includes(r.status)).length,
      completedRides: completed.length,
      cancelledRides: d.rides.filter((r) => r.status === RIDE_STATUS.CANCELLED).length,
      revenue: completed.reduce((s, r) => s + r.fare, 0),
    };
  },
};

export default { authApi, riderApi, mapApi, ridesApi, chatApi, paymentsApi, adminApi };
