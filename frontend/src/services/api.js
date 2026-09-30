/* ============================================================
   services/api.js
   Single place for all data access.

   Right now it runs on a MOCK backend backed by localStorage so
   the whole UI works without a server. When your real backend is
   ready, set USE_MOCK = false and point BASE_URL at it — every
   exported function already has the right shape.
   ============================================================ */

const USE_MOCK = true;
const BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';

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

/* ---------------- real HTTP client (used when USE_MOCK = false) ---------------- */
async function http(path, { method = 'GET', body, params } = {}) {
  const url = new URL(BASE_URL + path);
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

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
   AUTH
   ============================================================ */
export const authApi = {
  async login({ email, password }) {
    if (!USE_MOCK) return http('/auth/login', { method: 'POST', body: { email, password } });
    await delay();
    const d = db();
    const user = d.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password);
    if (!user) throw new Error('Invalid email or password');
    setToken(`mock.${user.id}`);
    return { user: publicUser(user), token: getToken() };
  },

  async register({ name, email, password, role = 'customer', phone = '' }) {
    if (!USE_MOCK) return http('/auth/register', { method: 'POST', body: { name, email, password, role, phone } });
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
    if (!USE_MOCK) return http('/auth/me');
    const t = getToken();
    if (!t) return null;
    const d = db();
    return publicUser(d.users.find((u) => u.id === t.replace('mock.', ''))) || null;
  },

  async updateProfile(userId, patch) {
    if (!USE_MOCK) return http(`/users/${userId}`, { method: 'PATCH', body: patch });
    await delay(180);
    const d = db();
    const u = d.users.find((x) => x.id === userId);
    Object.assign(u, patch);
    save(d);
    return publicUser(u);
  },

  logout() { setToken(null); },
};

/* ============================================================
   RIDES
   ============================================================ */
export const ridesApi = {
  async list({ customerId, riderId, status, available } = {}) {
    if (!USE_MOCK) return http('/rides', { params: { customerId, riderId, status, available } });
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
    if (!USE_MOCK) return http(`/rides/${id}`);
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
    if (!USE_MOCK) return http('/rides', { method: 'POST', body: payload });
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
    if (!USE_MOCK) return http(`/rides/${rideId}/accept`, { method: 'POST', body: { riderId } });
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
    if (!USE_MOCK) return http(`/rides/${rideId}/status`, { method: 'PATCH', body: { status } });
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

  async rate(rideId, rating) {
    if (!USE_MOCK) return http(`/rides/${rideId}/rate`, { method: 'POST', body: { rating } });
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
    if (!USE_MOCK) return http(`/rides/${rideId}/messages`);
    await delay(120);
    return db().messages.filter((m) => m.rideId === rideId);
  },
  async send(rideId, senderId, text) {
    if (!USE_MOCK) return http(`/rides/${rideId}/messages`, { method: 'POST', body: { senderId, text } });
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
    if (!USE_MOCK) return http('/payments/methods', { params: { userId } });
    await delay(150);
    return db().payments.filter((p) => p.userId === userId);
  },
  async topUp(userId, amount) {
    if (!USE_MOCK) return http('/payments/topup', { method: 'POST', body: { userId, amount } });
    await delay();
    const d = db();
    const u = d.users.find((x) => x.id === userId);
    u.wallet = (u.wallet || 0) + amount;
    save(d);
    return publicUser(u);
  },
  async setPrimary(userId, methodId) {
    if (!USE_MOCK) return http(`/payments/methods/${methodId}/primary`, { method: 'POST' });
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
    if (!USE_MOCK) return http('/admin/users', { params: { role } });
    await delay(180);
    const list = db().users.map(publicUser);
    return role ? list.filter((u) => u.role === role) : list;
  },
  async setUserStatus(userId, status) {
    if (!USE_MOCK) return http(`/admin/users/${userId}/status`, { method: 'PATCH', body: { status } });
    await delay(150);
    const d = db();
    const u = d.users.find((x) => x.id === userId);
    u.status = status;
    save(d);
    return publicUser(u);
  },
  async rides() {
    if (!USE_MOCK) return http('/admin/rides');
    await delay(180);
    const d = db();
    return d.rides.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((r) => hydrate(r, d));
  },
  async stats() {
    if (!USE_MOCK) return http('/admin/stats');
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

export default { authApi, ridesApi, chatApi, paymentsApi, adminApi };
