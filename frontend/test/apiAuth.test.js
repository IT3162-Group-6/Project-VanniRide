import test from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

const { ApiError, authApi, getToken, mapApi, ridesApi } = await import(
  '../src/services/api.js'
);

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

test.beforeEach(() => {
  storage.clear();
});

test('logs in against the backend, stores the token, and normalizes the user', async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url: String(url), options };
    return jsonResponse({
      success: true,
      token: 'signed-token',
      data: {
        user: {
          id: 'user-1',
          name: 'Test Rider',
          email: 'rider@example.com',
          phone: '0700000001',
          role: 'RIDER',
          accountStatus: 'ACTIVE',
          createdAt: '2026-10-02T00:00:00.000Z',
        },
        riderProfile: {
          approvalStatus: 'APPROVED',
          availabilityStatus: 'AVAILABLE',
          vehicle: {
            model: 'Honda Dio',
            registrationNumber: 'NP-1234',
          },
        },
      },
    });
  };

  const result = await authApi.login({
    email: ' rider@example.com ',
    password: 'secret12',
  });

  assert.equal(request.url, 'http://localhost:5000/api/auth/login');
  assert.deepEqual(JSON.parse(request.options.body), {
    email: 'rider@example.com',
    password: 'secret12',
  });
  assert.equal(getToken(), 'signed-token');
  assert.equal(result.user.role, 'rider');
  assert.equal(result.user.status, 'active');
  assert.equal(result.user.online, true);
  assert.equal(result.user.vehicle, 'Honda Dio · NP-1234');
});

test('sends the backend rider registration contract', async () => {
  let requestBody;
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return jsonResponse({
      success: true,
      token: 'registration-token',
      data: {
        user: { id: 'user-2', name: 'New Rider', role: 'RIDER' },
        riderProfile: {
          approvalStatus: 'PENDING',
          availabilityStatus: 'UNAVAILABLE',
          vehicle: requestBody.vehicle,
        },
      },
    }, 201);
  };

  const result = await authApi.register({
    name: ' New Rider ',
    email: ' new@example.com ',
    phone: ' 0700000002 ',
    password: 'secret12',
    role: 'rider',
    vehicle: {
      type: 'Motorcycle',
      model: 'Honda Dio',
      registrationNumber: 'NP-5678',
      color: 'Black',
    },
  });

  assert.equal(requestBody.role, 'RIDER');
  assert.equal(requestBody.name, 'New Rider');
  assert.equal(requestBody.phone, '0700000002');
  assert.equal(requestBody.vehicle.registrationNumber, 'NP-5678');
  assert.equal(result.user.riderProfile.approvalStatus, 'pending');
});

test('restores a token through the protected profile endpoint', async () => {
  localStorage.setItem('vr_token', 'existing-token');
  let request;
  global.fetch = async (url, options) => {
    request = { url: String(url), options };
    return jsonResponse({
      success: true,
      data: {
        user: { id: 'user-3', name: 'Customer', role: 'CUSTOMER' },
        riderProfile: null,
      },
    });
  };

  const user = await authApi.me();
  assert.equal(request.url, 'http://localhost:5000/api/users/profile');
  assert.equal(request.options.headers.Authorization, 'Bearer existing-token');
  assert.equal(user.role, 'customer');
});

test('updates the shared profile endpoint and invalidates the server session on logout', async () => {
  localStorage.setItem('vr_token', 'profile-token');
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).endsWith('/users/profile')) {
      return jsonResponse({
        success: true,
        data: {
          user: {
            id: 'user-4',
            name: 'Updated Name',
            phone: '0700000004',
            role: 'CUSTOMER',
            accountStatus: 'ACTIVE',
          },
        },
      });
    }
    return jsonResponse({ success: true, message: 'Logged out successfully' });
  };

  const user = await authApi.updateProfile('user-4', {
    name: 'Updated Name',
    phone: '0700000004',
    ignoredFrontendField: 'not sent',
  });
  assert.equal(user.name, 'Updated Name');
  assert.equal(requests[0].options.method, 'PUT');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    name: 'Updated Name',
    phone: '0700000004',
  });

  await authApi.logout();
  assert.equal(requests[1].url, 'http://localhost:5000/api/auth/logout');
  assert.equal(requests[1].options.method, 'POST');
  assert.equal(getToken(), null);
});

test('clears an expired token and reports useful connection errors', async () => {
  localStorage.setItem('vr_token', 'expired-token');
  global.fetch = async () =>
    jsonResponse({ success: false, message: 'Invalid or expired token' }, 401);
  assert.equal(await authApi.me(), null);
  assert.equal(getToken(), null);

  global.fetch = async () => {
    throw new TypeError('network unavailable');
  };
  await assert.rejects(
    authApi.login({ email: 'a@example.com', password: 'secret12' }),
    (error) => error instanceof ApiError && error.status === 0
  );
});

test('uses backend map results and creates a ride without trusting client fare values', async () => {
  localStorage.setItem('vr_token', 'customer-map-token');
  const requests = [];
  global.fetch = async (url, options) => {
    const request = { url: String(url), options };
    requests.push(request);
    if (request.url.includes('/maps/search')) {
      return jsonResponse({
        success: true,
        data: {
          places: [
            {
              displayName: 'University of Vavuniya',
              latitude: 8.7581,
              longitude: 80.4982,
              providerPlaceId: '1',
            },
          ],
        },
      });
    }
    if (request.url.includes('/maps/reverse')) {
      return jsonResponse({
        success: true,
        data: {
          place: {
            displayName: 'Vavuniya Town',
            latitude: 8.7514,
            longitude: 80.4971,
          },
        },
      });
    }
    if (request.url.endsWith('/maps/route-preview')) {
      return jsonResponse({
        success: true,
        data: {
          routePreview: {
            distanceKm: 0.75,
            durationMinutes: 2,
            estimatedFare: 260,
            routeGeometry: { type: 'LineString', coordinates: [] },
          },
        },
      });
    }
    return jsonResponse({
      success: true,
      data: {
        ride: {
          id: 'ride-1',
          rideType: 'TRANSPORT',
          pickupLocation: routePayload.pickupLocation,
          destination: routePayload.destination,
          distanceKm: 0.75,
          estimatedFare: 260,
          status: 'REQUESTED',
          requestedAt: '2026-10-02T00:00:00.000Z',
        },
      },
    }, 201);
  };

  const routePayload = {
    rideType: 'TRANSPORT',
    deliveryCategory: null,
    pickupLocation: {
      address: 'University of Vavuniya',
      latitude: 8.7581,
      longitude: 80.4982,
    },
    destination: {
      address: 'Vavuniya Town',
      latitude: 8.7514,
      longitude: 80.4971,
    },
  };
  const places = await mapApi.search('Vavuniya');
  const place = await mapApi.reverse(8.7514, 80.4971);
  const preview = await mapApi.previewRoute(routePayload);
  const ride = await ridesApi.create(routePayload);

  assert.equal(places[0].displayName, 'University of Vavuniya');
  assert.equal(place.displayName, 'Vavuniya Town');
  assert.equal(preview.estimatedFare, 260);
  assert.equal(ride.status, 'pending');
  assert.equal(ride.apiStatus, 'REQUESTED');
  assert.equal(ride.pickup, 'University of Vavuniya');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer customer-map-token');
  const createBody = JSON.parse(requests[3].options.body);
  assert.deepEqual(createBody, routePayload);
  assert.equal(Object.hasOwn(createBody, 'estimatedFare'), false);
  assert.equal(Object.hasOwn(createBody, 'distanceKm'), false);
});
