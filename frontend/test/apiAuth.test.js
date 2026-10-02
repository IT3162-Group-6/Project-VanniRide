import test from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

const { ApiError, authApi, getToken, mapApi, riderApi, ridesApi } = await import(
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

test('loads customer history, cash status, allowance, and mutual cancellation APIs', async () => {
  localStorage.setItem('vr_token', 'customer-history-token');
  const requests = [];
  global.fetch = async (url, options) => {
    const request = { url: String(url), options };
    requests.push(request);
    if (request.url.endsWith('/users/history')) {
      return jsonResponse({
        success: true,
        data: {
          summary: {
            rides: { total: 1, active: 1, completed: 0, cancelled: 0 },
            payments: { paid: 0, pending: 1, totalPaidAmount: 0 },
          },
          history: [
            {
              ride: {
                id: 'ride-history-1',
                rideType: 'TRANSPORT',
                pickupLocation: { address: 'A' },
                destination: { address: 'B' },
                distanceKm: 2,
                estimatedFare: 360,
                status: 'STARTED',
                requestedAt: '2026-10-02T00:00:00.000Z',
              },
              participant: { id: 'rider-1', name: 'Rider', phone: '0700000005' },
              payment: { amount: 360, paymentMethod: 'CASH', paymentStatus: 'PENDING' },
              cancellation: null,
              rating: null,
            },
          ],
        },
      });
    }
    if (request.url.endsWith('/users/cancellation-allowance')) {
      return jsonResponse({
        success: true,
        data: { cancellationAllowance: { limit: 5, used: 1, remaining: 4 } },
      });
    }
    if (request.url.endsWith('/rides/ride-history-1/payment')) {
      return jsonResponse({
        success: true,
        data: {
          payment: { id: 'payment-1', amount: 360, paymentMethod: 'CASH', paymentStatus: 'PENDING' },
        },
      });
    }
    if (request.url.endsWith('/rides/ride-history-1/cancel')) {
      return jsonResponse({
        success: true,
        message: 'Cancellation confirmation requested from the other participant',
        data: {
          cancellationRequest: {
            id: 'cancel-request-1',
            rideId: 'ride-history-1',
            respondingUserId: 'rider-1',
            status: 'PENDING',
          },
          cancellationAllowance: { limit: 5, used: 2, remaining: 3 },
        },
      }, 202);
    }
    if (request.url.endsWith('/rides/ride-history-1/cancellation-request')) {
      return jsonResponse({
        success: true,
        message: 'Ride will resume',
        data: {
          ride: {
            id: 'ride-history-1',
            rideType: 'TRANSPORT',
            pickupLocation: { address: 'A' },
            destination: { address: 'B' },
            status: 'STARTED',
          },
          cancellationRequest: { id: 'cancel-request-1', status: 'RESUMED' },
        },
      });
    }
    throw new Error(`Unexpected request: ${request.url}`);
  };

  const history = await ridesApi.history();
  const allowance = await ridesApi.cancellationAllowance();
  const payment = await ridesApi.payment('ride-history-1');
  const cancellation = await ridesApi.cancelWithReason('ride-history-1', 'Plans changed');
  const resumed = await ridesApi.respondToCancellation('ride-history-1', 'RESUME');

  assert.equal(history.rides[0].status, 'picked');
  assert.equal(history.rides[0].payment.status, 'pending');
  assert.equal(history.rides[0].rider.name, 'Rider');
  assert.equal(allowance.remaining, 4);
  assert.equal(payment.method, 'cash');
  assert.equal(cancellation.pendingConfirmation, true);
  assert.equal(cancellation.cancellationAllowance.remaining, 3);
  assert.equal(resumed.ride.status, 'picked');
  assert.deepEqual(JSON.parse(requests[3].options.body), { reason: 'Plans changed' });
  assert.deepEqual(JSON.parse(requests[4].options.body), { decision: 'RESUME' });
});

test('connects rider availability, requests, lifecycle, earnings, vehicle, and cash confirmation', async () => {
  localStorage.setItem('vr_token', 'rider-token');
  const requests = [];
  global.fetch = async (url, options) => {
    const request = { url: String(url), options }; requests.push(request);
    if (request.url.endsWith('/users/rider/availability')) return jsonResponse({success:true,data:{riderProfile:{approvalStatus:'APPROVED',availabilityStatus:'AVAILABLE'}}});
    if (request.url.endsWith('/users/rider/profile')) return jsonResponse({success:true,data:{riderProfile:{approvalStatus:'PENDING',availabilityStatus:'UNAVAILABLE',vehicle:{model:'Dio',registrationNumber:'NP-9'}},reapprovalTriggered:true}});
    if (request.url.endsWith('/users/rider/earnings')) return jsonResponse({success:true,data:{summary:{totalEarnings:500,pendingReceiptAmount:200},earnings:[]}});
    if (request.url.endsWith('/rides/available')) return jsonResponse({success:true,data:{rides:[{id:'r1',rideType:'TRANSPORT',pickupLocation:{address:'A'},destination:{address:'B'},status:'REQUESTED',estimatedFare:200}]}});
    if (request.url.endsWith('/rides/r1/accept')) return jsonResponse({success:true,data:{ride:{id:'r1',rideType:'TRANSPORT',pickupLocation:{address:'A'},destination:{address:'B'},status:'ACCEPTED',estimatedFare:200}}});
    if (request.url.endsWith('/rides/r1/status')) return jsonResponse({success:true,data:{ride:{id:'r1',rideType:'TRANSPORT',pickupLocation:{address:'A'},destination:{address:'B'},status:'ARRIVED',estimatedFare:200}}});
    if (request.url.endsWith('/rides/r1/payment')) return jsonResponse({success:true,data:{payment:{id:'p1',paymentMethod:'CASH',paymentStatus:'PAID',amount:200}}});
    throw new Error(`Unexpected request ${request.url}`);
  };
  assert.equal((await riderApi.setAvailability(true)).availabilityStatus, 'available');
  assert.equal((await riderApi.updateVehicle({type:'Motorcycle',model:'Dio',registrationNumber:'NP-9',color:'Black'})).reapprovalTriggered, true);
  assert.equal((await riderApi.earnings()).summary.totalEarnings, 500);
  assert.equal((await ridesApi.list({available:true}))[0].status, 'pending');
  assert.equal((await ridesApi.accept('r1')).status, 'accepted');
  assert.equal((await ridesApi.updateStatus('r1', 'ontheway')).apiStatus, 'ARRIVED');
  assert.equal((await ridesApi.confirmCashPayment('r1')).status, 'paid');
  assert.equal(JSON.parse(requests[5].options.body).status, 'ARRIVED');
});
