import test from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

const {
  ApiError,
  adminApi,
  authApi,
  chatApi,
  getToken,
  mapApi,
  notificationsApi,
  ratingApi,
  riderApi,
  ridesApi,
} = await import('../src/services/api.js');
const { QUICK_PICK_LOCATIONS } = await import('../src/data/quickPickLocations.js');
const {
  filterConversations,
  isConversationRide,
} = await import('../src/data/conversationFilters.js');

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

test.beforeEach(() => {
  storage.clear();
});

test('offers the approved frequently used Vavuniya locations', () => {
  assert.deepEqual(
    QUICK_PICK_LOCATIONS.map((place) => place.displayName),
    [
      'University of Vavuniya',
      'Vavuniya Town',
      'Vavuniya Bus Stand',
      'Vavuniya Railway Station',
      'Poovarasankulam Hospital',
      'Hostel Premises, Pambaimadu',
    ]
  );
  assert.equal(
    QUICK_PICK_LOCATIONS.some((place) => /teaching hospital/i.test(place.displayName)),
    false
  );
});

test('builds participant conversations and filters them by lifecycle state', () => {
  const rides = [
    { id: 'active', status: 'accepted', rider: { id: 'r1' } },
    { id: 'complete', status: 'completed', rider: { id: 'r1' } },
    { id: 'cancelled', status: 'cancelled', rider: { id: 'r1' } },
    { id: 'waiting', status: 'pending', rider: null },
  ];
  const conversations = rides.filter((ride) => isConversationRide(ride, 'rider'));
  assert.deepEqual(conversations.map((ride) => ride.id), [
    'active',
    'complete',
    'cancelled',
  ]);
  assert.deepEqual(
    filterConversations(conversations, 'active').map((ride) => ride.id),
    ['active']
  );
  assert.deepEqual(
    filterConversations(conversations, 'completed').map((ride) => ride.id),
    ['complete']
  );
  assert.deepEqual(
    filterConversations(conversations, 'cancelled').map((ride) => ride.id),
    ['cancelled']
  );
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
    identityNumber: 'ST-2026-002',
    securityQuestion: 'first_school',
    securityAnswer: 'Vavuniya College',
    vehicle: {
      type: 'Motorcycle',
      model: 'Honda Dio',
      registrationNumber: 'NP-5678',
      color: 'Black',
    },
  });

  assert.equal(requestBody.role, 'RIDER');
  assert.deepEqual(requestBody.roles, ['RIDER']);
  assert.equal(requestBody.identityNumber, 'ST-2026-002');
  assert.equal(requestBody.securityQuestion, 'first_school');
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

  localStorage.setItem('vr_token', 'revoked-token');
  global.fetch = async () =>
    jsonResponse({ success: false, message: 'This session is no longer valid' }, 401);
  await assert.rejects(
    ridesApi.history(),
    (error) => error instanceof ApiError && error.status === 401
  );
  assert.equal(getToken(), null);

  localStorage.setItem('vr_token', 'suspended-token');
  global.fetch = async () =>
    jsonResponse({ success: false, message: 'This account is suspended' }, 403);
  await assert.rejects(
    ridesApi.history(),
    (error) => error instanceof ApiError && error.status === 403
  );
  assert.equal(getToken(), null);
});

test('requests and completes password recovery without storing a session token', async () => {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return jsonResponse({
      success: true,
      message: String(url).endsWith('/forgot-password')
        ? 'If the account and identity details match, an administrator will review the password reset request.'
        : 'Password reset successfully. You can now log in.',
    });
  };

  const forgotMessage = await authApi.forgotPassword({
    email: '  person@vau.ac.lk  ',
    identityNumber: ' 2026-001 ',
    securityQuestion: 'first_school',
    securityAnswer: 'Example School',
  });
  const resetMessage = await authApi.resetPassword('a'.repeat(64), 'new-password-123');

  assert.match(forgotMessage, /identity details match/);
  assert.match(resetMessage, /reset successfully/);
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    email: 'person@vau.ac.lk',
    identityNumber: '2026-001',
    securityQuestion: 'first_school',
    securityAnswer: 'Example School',
  });
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    token: 'a'.repeat(64),
    password: 'new-password-123',
  });
  assert.equal(getToken(), null);
});

test('switches an authorized role and manages logged-in security settings', async () => {
  localStorage.setItem('vr_token', 'customer-token');
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    const path = new URL(String(url)).pathname;
    if (path.endsWith('/auth/switch-role')) {
      return jsonResponse({
        success: true,
        token: 'rider-token',
        data: {
          user: { id: 'dual-1', name: 'Dual User', role: 'RIDER', roles: ['CUSTOMER', 'RIDER'] },
          riderProfile: { approvalStatus: 'APPROVED', availabilityStatus: 'UNAVAILABLE' },
        },
      });
    }
    if (path.endsWith('/users/recovery-settings')) {
      return jsonResponse({
        success: true,
        data: { user: { id: 'dual-1', name: 'Dual User', role: 'RIDER', roles: ['CUSTOMER', 'RIDER'], recoveryConfigured: true } },
      });
    }
    if (path.endsWith('/auth/change-password')) {
      return jsonResponse({ success: true, message: 'Password changed successfully. Please sign in again.' });
    }
    throw new Error(`Unexpected request ${url}`);
  };

  const switched = await authApi.switchRole('rider');
  assert.equal(switched.role, 'rider');
  assert.deepEqual(switched.roles, ['customer', 'rider']);
  assert.equal(getToken(), 'rider-token');

  const recovery = await authApi.updateRecoverySettings({
    currentPassword: 'old-password',
    identityNumber: 'ST-001',
    securityQuestion: 'birth_place',
    securityAnswer: 'Vavuniya',
  });
  assert.equal(recovery.recoveryConfigured, true);

  await authApi.changePassword('old-password', 'new-password');
  assert.equal(getToken(), null);
  assert.deepEqual(JSON.parse(requests[0].options.body), { role: 'RIDER' });
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
    if (request.url.endsWith('/users/rider-availability-summary')) return jsonResponse({success:true,data:{riderAvailability:{available:3,busy:1,offline:2,approved:6}}});
    if (request.url.endsWith('/users/rider/availability')) return jsonResponse({success:true,data:{riderProfile:{approvalStatus:'APPROVED',availabilityStatus:'AVAILABLE'}}});
    if (request.url.endsWith('/users/rider/profile')) return jsonResponse({success:true,data:{riderProfile:{approvalStatus:'PENDING',availabilityStatus:'UNAVAILABLE',vehicle:{model:'Dio',registrationNumber:'NP-9'}},reapprovalTriggered:true}});
    if (request.url.endsWith('/users/rider/earnings')) return jsonResponse({success:true,data:{summary:{totalEarnings:500,pendingReceiptAmount:200},earnings:[]}});
    if (request.url.endsWith('/rides/available')) return jsonResponse({success:true,data:{rides:[{id:'r1',rideType:'TRANSPORT',pickupLocation:{address:'A'},destination:{address:'B'},status:'REQUESTED',estimatedFare:200}]}});
    if (request.url.endsWith('/rides/r1/ignore') && options.method === 'PATCH') return jsonResponse({success:true,data:{rideId:'r1',ignored:true,ignoredAt:'2026-10-02T00:00:00.000Z'}});
    if (request.url.endsWith('/rides/r1/ignore') && options.method === 'DELETE') return jsonResponse({success:true,data:{rideId:'r1',ignored:false}});
    if (request.url.endsWith('/rides/r1/accept')) return jsonResponse({success:true,data:{ride:{id:'r1',rideType:'TRANSPORT',pickupLocation:{address:'A'},destination:{address:'B'},status:'ACCEPTED',estimatedFare:200}}});
    if (request.url.endsWith('/rides/r1/status')) return jsonResponse({success:true,data:{ride:{id:'r1',rideType:'TRANSPORT',pickupLocation:{address:'A'},destination:{address:'B'},status:'ARRIVED',estimatedFare:200}}});
    if (request.url.endsWith('/rides/r1/payment')) return jsonResponse({success:true,data:{payment:{id:'p1',paymentMethod:'CASH',paymentStatus:'PAID',amount:200}}});
    throw new Error(`Unexpected request ${request.url}`);
  };
  assert.deepEqual(await riderApi.availabilitySummary(), { available: 3, busy: 1, offline: 2, approved: 6 });
  assert.equal((await riderApi.setAvailability(true)).availabilityStatus, 'available');
  assert.equal((await riderApi.updateVehicle({type:'Motorcycle',model:'Dio',registrationNumber:'NP-9',color:'Black'})).reapprovalTriggered, true);
  assert.equal((await riderApi.earnings()).summary.totalEarnings, 500);
  assert.equal((await ridesApi.list({available:true}))[0].status, 'pending');
  assert.equal((await ridesApi.ignore('r1')).ignored, true);
  assert.equal((await ridesApi.restore('r1')).ignored, false);
  assert.equal((await ridesApi.accept('r1')).status, 'accepted');
  assert.equal((await ridesApi.updateStatus('r1', 'ontheway')).apiStatus, 'ARRIVED');
  assert.equal((await ridesApi.confirmCashPayment('r1')).status, 'paid');
  const statusRequest = requests.find((request) => request.url.endsWith('/rides/r1/status'));
  assert.equal(JSON.parse(statusRequest.options.body).status, 'ARRIVED');
});

test('connects ride chat, access requests, and rider ratings', async () => {
  localStorage.setItem('vr_token', 'chat-token');
  const requests = [];
  global.fetch = async (url, options) => {
    const request = { url: String(url), options };
    requests.push(request);
    if (request.url.endsWith('/rides/r1/messages') && options.method === 'GET') {
      return jsonResponse({
        success: true,
        data: {
          messages: [{ id: 'm1', messageText: 'Hello', sentAt: '2026-10-02T09:00:00.000Z' }],
          chatAccess: { canSend: true, mode: 'ACTIVE_RIDE' },
        },
      });
    }
    if (request.url.endsWith('/rides/r1/messages')) {
      return jsonResponse({
        success: true,
        data: { message: { id: 'm2', messageText: 'Found it', sentAt: '2026-10-02T09:01:00.000Z' } },
      }, 201);
    }
    if (request.url.endsWith('/rides/r1/chat-access-requests')) {
      return jsonResponse({ success: true, data: { chatAccessRequest: { id: 'a1', status: 'PENDING' } } }, 201);
    }
    if (request.url.endsWith('/rides/r1/rating')) {
      return jsonResponse({ success: true, data: { rating: { id: 'rate1', rating: 5, review: 'Safe ride' } } }, 201);
    }
    if (request.url.endsWith('/riders/rider-1/ratings')) {
      return jsonResponse({ success: true, data: { summary: { totalRatings: 1, averageRating: 5 }, ratings: [{ id: 'rate1', rating: 5 }] } });
    }
    throw new Error(`Unexpected request ${request.url}`);
  };

  const conversation = await chatApi.list('r1');
  const message = await chatApi.send('r1', 'customer-1', 'Found it');
  const accessRequest = await chatApi.requestAccess('r1', 'Lost item');
  const rating = await ridesApi.rate('r1', { rating: 5, review: 'Safe ride' });
  const riderRatings = await ratingApi.forRider('rider-1');

  assert.equal(conversation.messages[0].text, 'Hello');
  assert.equal(conversation.access.mode, 'ACTIVE_RIDE');
  assert.equal(message.text, 'Found it');
  assert.equal(accessRequest.status, 'PENDING');
  assert.equal(rating.rating, 5);
  assert.equal(riderRatings.summary.averageRating, 5);
  assert.deepEqual(JSON.parse(requests[1].options.body), { messageText: 'Found it' });
  assert.deepEqual(JSON.parse(requests[2].options.body), { reason: 'Lost item' });
  assert.deepEqual(JSON.parse(requests[3].options.body), { rating: 5, review: 'Safe ride' });
});

test('lists and updates notifications through the backend API', async () => {
  localStorage.setItem('vr_token', 'notification-token');
  const requests = [];
  global.fetch = async (url, options) => {
    const request = { url: String(url), options };
    requests.push(request);
    if (request.url.includes('/notifications?')) {
      return jsonResponse({
        success: true,
        data: {
          unreadCount: 1,
          notifications: [{ id: 'n1', title: 'Ride accepted', isRead: false }],
        },
      });
    }
    if (request.url.endsWith('/notifications/n1/read')) {
      return jsonResponse({ success: true, data: { notification: { id: 'n1', isRead: true } } });
    }
    if (request.url.endsWith('/notifications/read-all')) {
      return jsonResponse({ success: true, data: { updatedCount: 2 } });
    }
    if (request.url.endsWith('/admin/notifications/broadcast')) {
      return jsonResponse({ success: true, data: { recipientCount: 4 } }, 201);
    }
    throw new Error(`Unexpected request ${request.url}`);
  };

  assert.equal((await notificationsApi.list()).unreadCount, 1);
  assert.equal((await notificationsApi.markRead('n1')).isRead, true);
  assert.equal(await notificationsApi.markAllRead(), 2);
  assert.equal(
    (await notificationsApi.broadcast({ title: 'Update', message: 'Ready', roles: ['CUSTOMER'] })).recipientCount,
    4
  );
  assert.deepEqual(requests.map((request) => request.options.method), ['GET', 'PATCH', 'PATCH', 'POST']);
});

test('connects administrator management, review, audit, and statistics APIs', async () => {
  localStorage.setItem('vr_token', 'admin-token');
  const requests = [];
  global.fetch = async (url, options) => {
    const request = { url: String(url), options }; requests.push(request);
    const path = new URL(request.url).pathname;
    if (path.endsWith('/admin/users') && options.method === 'GET') return jsonResponse({ success: true, data: { users: [{ id: 'u1', name: 'Rider', email: 'r@example.com', role: 'RIDER', accountStatus: 'ACTIVE' }] } });
    if (path.endsWith('/admin/users/u1/status')) return jsonResponse({ success: true, data: { user: { id: 'u1', name: 'Rider', email: 'r@example.com', role: 'RIDER', accountStatus: 'SUSPENDED' } } });
    if (path.endsWith('/admin/riders') && options.method === 'GET') return jsonResponse({ success: true, data: { riders: [{ id: 'rp1', userId: 'u1', approvalStatus: 'PENDING', availabilityStatus: 'UNAVAILABLE', vehicle: { model: 'Dio', registrationNumber: 'NP-1' }, user: { id: 'u1', name: 'Rider', email: 'r@example.com', role: 'RIDER', accountStatus: 'ACTIVE' } }] } });
    if (path.endsWith('/admin/riders/u1/approval')) return jsonResponse({ success: true, data: { riderProfile: { id: 'rp1', userId: 'u1', approvalStatus: 'APPROVED', availabilityStatus: 'UNAVAILABLE' } } });
    if (path.endsWith('/admin/rides') && options.method === 'GET') return jsonResponse({ success: true, data: { rides: [{ id: 'ride1', customerId: 'c1', rideType: 'TRANSPORT', pickupLocation: { address: 'A' }, destination: { address: 'B' }, distanceKm: 2, estimatedFare: 300, status: 'STARTED', requestedAt: '2026-10-03T00:00:00.000Z', customer: { id: 'c1', name: 'Customer' }, assignedRider: { id: 'u1', name: 'Rider' } }] } });
    if (path.endsWith('/admin/rides/ride1/messages')) return jsonResponse({ success: true, data: { messages: [{ id: 'm1', sender: { id: 'c1', name: 'Customer', role: 'CUSTOMER' }, messageText: 'Help', sentAt: '2026-10-03T00:01:00.000Z' }] } });
    if (path.endsWith('/admin/rides/ride1/cancel')) return jsonResponse({ success: true, data: { ride: { id: 'ride1', customerId: 'c1', rideType: 'TRANSPORT', pickupLocation: { address: 'A' }, destination: { address: 'B' }, distanceKm: 2, estimatedFare: 300, status: 'CANCELLED', requestedAt: '2026-10-03T00:00:00.000Z' } } });
    if (path.endsWith('/admin/payments/p1')) return jsonResponse({ success: true, data: { payment: { id: 'p1', rideId: 'ride1', amount: 300, paymentStatus: 'PAID' } } });
    if (path.endsWith('/admin/payments')) return jsonResponse({ success: true, data: { payments: [{ id: 'p1', rideId: 'ride1', amount: 300, paymentStatus: 'PENDING' }] } });
    if (path.endsWith('/admin/ratings')) return jsonResponse({ success: true, data: { ratings: [{ id: 'rate1', rideId: 'ride1', rating: 5 }] } });
    if (path.endsWith('/admin/chat-access-requests/a1')) return jsonResponse({ success: true, data: { chatAccessRequest: { id: 'a1', rideId: 'ride1', status: 'APPROVED' } } });
    if (path.endsWith('/admin/chat-access-requests')) return jsonResponse({ success: true, data: { chatAccessRequests: [{ id: 'a1', rideId: 'ride1', status: 'PENDING' }] } });
    if (path.endsWith('/admin/password-reset-requests/pr1')) return jsonResponse({ success: true, data: { passwordResetRequest: { id: 'pr1', status: 'RESOLVED' } } });
    if (path.endsWith('/admin/password-reset-requests')) return jsonResponse({ success: true, data: { passwordResetRequests: [{ id: 'pr1', status: 'PENDING', user: { id: 'c1', name: 'Customer', email: 'c@example.com' } }] } });
    if (path.endsWith('/admin/statistics')) return jsonResponse({ success: true, data: { statistics: { users: { customers: 2, riders: 1, admins: 1 }, rides: { total: 4, active: 1, completed: 2, cancelled: 1 }, payments: { totalPaidAmount: 600, pending: 1 }, riderApprovals: { pending: 1 }, riderAvailability: { available: 2, busy: 1, offline: 3 }, chatAccessRequests: { pending: 1 }, ratings: { averageRating: 5 } } } });
    throw new Error(`Unexpected request ${request.url}`);
  };

  assert.equal((await adminApi.users('rider'))[0].status, 'active');
  assert.equal((await adminApi.riders())[0].riderProfile.approvalStatus, 'pending');
  assert.equal((await adminApi.setUserStatus('u1', 'suspended', 'Policy')).status, 'suspended');
  assert.equal((await adminApi.reviewRider('u1', 'APPROVE', 'Documents valid')).approvalStatus, 'approved');
  const rides = await adminApi.rides();
  assert.equal(rides[0].status, 'picked');
  assert.equal(rides[0].customer.name, 'Customer');
  assert.equal((await adminApi.messages('ride1', 'Safety review'))[0].text, 'Help');
  assert.equal((await adminApi.forceCancel('ride1', 'Safety concern')).status, 'cancelled');
  assert.equal((await adminApi.payments())[0].paymentStatus, 'PENDING');
  assert.equal((await adminApi.correctPayment('p1', { amount: 300, paymentStatus: 'PAID', reason: 'Receipt' })).paymentStatus, 'PAID');
  assert.equal((await adminApi.ratings())[0].rating, 5);
  assert.equal((await adminApi.chatAccessRequests())[0].status, 'PENDING');
  assert.equal((await adminApi.reviewChatAccess('a1', 'APPROVE', 'Lost item')).status, 'APPROVED');
  const statistics = await adminApi.stats();
  assert.equal(statistics.pendingChatRequests, 1);
  assert.equal(statistics.availableRiders, 2);
  assert.equal(statistics.busyRiders, 1);
  assert.equal(statistics.offlineRiders, 3);
  assert.equal((await adminApi.passwordResetRequests())[0].status, 'PENDING');
  assert.equal((await adminApi.resolvePasswordResetRequest('pr1', 'Identity verified')).status, 'RESOLVED');

  assert.deepEqual(JSON.parse(requests[2].options.body), { accountStatus: 'SUSPENDED', reason: 'Policy' });
  assert.deepEqual(JSON.parse(requests[3].options.body), { decision: 'APPROVE', reason: 'Documents valid' });
  assert.ok(requests[5].url.includes('reason=Safety+review'));
  assert.deepEqual(JSON.parse(requests.at(-1).options.body), { reason: 'Identity verified' });
});
