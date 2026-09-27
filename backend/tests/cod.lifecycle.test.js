// Exercise real controllers and model together against a transactional in-memory store.
const mockRows = new Map();
let mockSerial = Promise.resolve();
function mockRef(path) {
  return {
    path, id: path.split('/').pop(),
    get: async () => ({ exists: mockRows.has(path), id: path.split('/').pop(), data: () => structuredClone(mockRows.get(path)), ref: mockRef(path) }),
    set: async data => mockRows.set(path, structuredClone(data)),
    update: async data => mockRows.set(path, { ...mockRows.get(path), ...structuredClone(data) }),
  };
}
function mockQuery(name, filters = []) {
  return {
    doc: id => mockRef(`${name}/${id}`),
    where: (field, op, value) => mockQuery(name, [...filters, [field, op, value]]),
    orderBy: () => mockQuery(name, filters),
    get: async () => {
      const docs = [...mockRows].filter(([path, row]) => path.startsWith(`${name}/`) && filters.every(([field, op, value]) => op === 'in' ? value.includes(row[field]) : row[field] === value)).map(([path]) => ({ id: path.split('/').pop(), ref: mockRef(path), data: () => structuredClone(mockRows.get(path)) }));
      return { docs, empty: !docs.length, size: docs.length, forEach: cb => docs.forEach(cb) };
    },
  };
}
const mockDb = {
  collection: mockQuery,
  runTransaction: jest.fn(fn => {
    const run = mockSerial.then(async () => {
      const writes = [];
      const result = await fn({ get: ref => ref.get(), update: (ref, data) => writes.push(() => ref.update(data)), set: (ref, data) => writes.push(() => ref.set(data)) });
      for (const write of writes) await write();
      return result;
    });
    mockSerial = run.catch(() => {});
    return run;
  }),
};
jest.mock('../src/config/firebase.config', () => ({ firestore: () => mockDb, auth: () => ({ verifyIdToken: async token => ({ uid: token }) }) }));
jest.mock('uuid', () => ({ v4: () => 'new-sub' }));
jest.mock('../src/utils/cache.util', () => ({ get: jest.fn(), set: jest.fn(), delete: jest.fn() }));
jest.mock('../src/models/activity.model', () => ({ logActivity: jest.fn().mockResolvedValue(true) }));
jest.mock('../src/models/notification.model', () => ({ create: jest.fn().mockResolvedValue(true) }));
jest.mock('../src/services/email.service', () => ({ sendPaymentConfirmationEmail: jest.fn().mockResolvedValue(true) }));
jest.mock('../src/services/stripe.service', () => ({ cancelSubscription: jest.fn().mockResolvedValue(true) }));
jest.mock('../src/models/menu.model', () => ({ getMenuConfig: jest.fn().mockResolvedValue({ plans: { standard: { price: 190 } } }), getCityFromAddress: () => 'London', getCityCategory: () => 'local' }));
const Subscription = require('../src/models/subscription.model');
const UserController = require('../src/controllers/subscription.controller');
const AdminController = require('../src/controllers/admin.controller');
const Email = require('../src/services/email.service');
const Stripe = require('../src/services/stripe.service');
function response() { return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }; }
function request(body = {}) { return { user: { uid: 'customer' }, body, params: { subscriptionId: 'new-sub' }, query: {} }; }
function seed(overrides = {}) {
  const sub = { subscriptionId: 'new-sub', userId: 'customer', plan: 'Standard', planDetails: { price: 190 }, status: 'Pending', paymentMethod: 'Cash on Delivery', paymentStatus: 'Pending', durationDays: 30, approvalStatus: 'Pending', startDate: null, endDate: null, createdAt: '2026-01-01T00:00:00.000Z', ...overrides };
  mockRows.set('subscriptions/new-sub', sub); return sub;
}
beforeEach(() => { mockRows.clear(); mockSerial = Promise.resolve(); mockRows.set('users/customer', { uid: 'customer', email: 'customer@example.test', phone: '1234567890' }); });

describe('COD subscription lifecycle', () => {
  it('only persists a fee breakdown when the caller supplies a reliable one', async () => {
    await Subscription.createSubscription('customer', {
      plan: 'Standard',
      planDetails: { price: 190 },
      paymentMethod: 'Online',
      paymentStatus: 'Paid',
    });
    const online = mockRows.get('subscriptions/new-sub');
    for (const field of ['basePrice', 'subtotal', 'discountAmount', 'discountedSubtotal', 'deliveryFee', 'platformServiceFee', 'totalAmount']) {
      expect(online).not.toHaveProperty(field);
    }

    mockRows.delete('subscriptions/new-sub');
    await Subscription.createSubscription('customer', {
      plan: 'Standard',
      planDetails: { price: 195.05 },
      paymentMethod: 'COD',
      basePrice: 190,
      subtotal: 190,
      discountAmount: 0,
      discountedSubtotal: 190,
      deliveryFee: 0,
      platformServiceFee: 5.05,
      totalAmount: 195.05,
    });
    expect(mockRows.get('subscriptions/new-sub')).toMatchObject({
      subtotal: 190,
      platformServiceFee: 5.05,
      totalAmount: 195.05,
    });
  });
  it('public checkout ignores forged Paid/Active and leaves dates unset', async () => {
    const res = response();
    await UserController.createSubscription(request({ plan: 'Standard', planDetails: 190, paymentMethod: 'COD', paymentStatus: 'Paid', status: 'Active' }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockRows.get('subscriptions/new-sub')).toMatchObject({ status: 'Pending', paymentStatus: 'Pending', startDate: null, endDate: null });
    expect(Email.sendPaymentConfirmationEmail).not.toHaveBeenCalled();
  });
  it('persists the full server-calculated COD amount breakdown', async () => {
    const res = response();
    await UserController.createSubscription(request({
      plan: 'Standard', planDetails: { price: 190 }, paymentMethod: 'COD',
      deliveryFee: 999, platformServiceFee: 999, totalAmount: 1,
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockRows.get('subscriptions/new-sub')).toMatchObject({
      subtotal: 190,
      discountAmount: 0,
      discountedSubtotal: 190,
      deliveryFee: 0,
      platformServiceFee: 5.05,
      totalAmount: 195.05,
      planDetails: expect.objectContaining({ price: 195.05 }),
    });
  });
  it('public checkout defaults to COD and rejects explicit unverified online payment', async () => {
    let res = response();
    await UserController.createSubscription(request({ plan: 'Standard', planDetails: 190 }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockRows.get('subscriptions/new-sub').paymentStatus).toBe('Pending');
    mockRows.delete('subscriptions/new-sub'); res = response();
    await UserController.createSubscription(request({ plan: 'Standard', planDetails: 190, paymentMethod: 'Online', paymentStatus: 'Paid' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockRows.has('subscriptions/new-sub')).toBe(false);
  });
  it('acceptance starts service dates without collecting payment or emailing an invoice', async () => {
    seed(); const res = response(); const before = Date.now();
    await AdminController.acceptSubscription(request(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    const sub = mockRows.get('subscriptions/new-sub');
    expect(sub).toMatchObject({ status: 'Active', paymentStatus: 'Pending' });
    expect(Date.parse(sub.startDate)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(sub.endDate) - Date.parse(sub.startDate)).toBe(30 * 86400000);
    expect(Email.sendPaymentConfirmationEmail).not.toHaveBeenCalled();
  });
  it.each(['Cancelled', 'Active', 'Expired'])('cannot accept a %s subscription', async status => {
    seed({ status }); const res = response();
    await AdminController.acceptSubscription(request(), res);
    expect(res.status.mock.calls[0][0]).toBeGreaterThanOrEqual(400);
    expect(mockRows.get('subscriptions/new-sub').status).toBe(status);
  });
  it('cannot collect payment before acceptance, including legacy order endpoint', async () => {
    seed();
    for (const legacy of [false, true]) {
      const req = request(); const res = response();
      if (legacy) { req.params = { orderId: 'new-sub' }; await AdminController.confirmCODPayment(req, res); }
      else await AdminController.confirmSubscriptionPayment(req, res);
      expect(res.status.mock.calls[0][0]).toBeGreaterThanOrEqual(400);
    }
    expect(mockRows.get('subscriptions/new-sub').paymentStatus).toBe('Pending');
    expect(Email.sendPaymentConfirmationEmail).not.toHaveBeenCalled();
  });
  it.each(['Active', 'Expired', 'Cancelled', 'Renewed'])('collects accepted %s debt without changing service status or dates', async status => {
    const original = seed({ status, approvalStatus: 'Accepted', acceptedAt: '2026-01-01T00:00:00.000Z', startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-31T00:00:00.000Z', subtotal: 190, discountAmount: 0, discountedSubtotal: 190, deliveryFee: 0, platformServiceFee: 5.05, totalAmount: 195.05, planDetails: { price: 195.05 } });
    const res = response(); await AdminController.confirmSubscriptionPayment(request(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockRows.get('subscriptions/new-sub')).toMatchObject({ status, paymentStatus: 'Paid', startDate: original.startDate, endDate: original.endDate });
    expect(Email.sendPaymentConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(Email.sendPaymentConfirmationEmail).toHaveBeenCalledWith(expect.objectContaining({
      amount: 195.05,
      details: expect.objectContaining({ totalAmount: 195.05, platformServiceFee: 5.05 }),
    }));
  });
  it('serializes concurrent confirmations and sends one invoice', async () => {
    seed({ status: 'Active', approvalStatus: 'Accepted', acceptedAt: '2026-01-01' }); const responses = [response(), response()];
    await Promise.all(responses.map(res => AdminController.confirmSubscriptionPayment(request(), res)));
    expect(responses.map(res => res.status.mock.calls[0][0]).sort()).toEqual([200, 409]);
    expect(Email.sendPaymentConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(mockDb.runTransaction).toHaveBeenCalledTimes(2);
  });
  it('defers replacing an existing paid subscription until acceptance', async () => {
    mockRows.set('subscriptions/old-sub', { subscriptionId: 'old-sub', userId: 'customer', status: 'Active', createdAt: '2025-01-01', endDate: '2099-01-01', stripeSubscriptionId: 'stripe-old' });
    const res = response();
    await UserController.createSubscription(request({ plan: 'Standard', planDetails: 190, replacePlan: true }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockRows.get('subscriptions/old-sub').status).toBe('Active');
    expect(Stripe.cancelSubscription).not.toHaveBeenCalled();
    await AdminController.acceptSubscription(request(), response());
    expect(mockRows.get('subscriptions/old-sub').status).not.toBe('Active');
    expect(Stripe.cancelSubscription).toHaveBeenCalledWith('stripe-old');
  });
});


describe('COD admin route authorization', () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/admin', require('../src/routes/admin.routes'));
  const http = require('supertest');
  it.each(['accept', 'confirm-payment'])('requires authentication and admin role for %s', async action => {
    seed();
    const path = `/admin/subscriptions/new-sub/${action}`;
    expect((await http(app).patch(path)).status).toBe(401);
    expect((await http(app).patch(path).set('Authorization', 'Bearer customer')).status).toBe(403);
    expect(mockRows.get('subscriptions/new-sub').status).toBe('Pending');
    expect(mockRows.get('subscriptions/new-sub').paymentStatus).toBe('Pending');
  });
  it('permits an admin to accept a subscription', async () => {
    seed(); mockRows.set('users/admin', { role: 'admin' });
    const result = await http(app).patch('/admin/subscriptions/new-sub/accept').set('Authorization', 'Bearer admin');
    expect(result.status).toBe(200);
    expect(mockRows.get('subscriptions/new-sub').paymentStatus).toBe('Pending');
  });
});

describe('COD approval bypass regressions', () => {
  it.each(['Preparing', 'Delivered', 'Active'])('order status %s cannot activate an unaccepted subscription', async status => {
    seed();
    const Order = require('../src/models/order.model');
    await expect(Order.updateStatus('new-sub', status)).rejects.toThrow();
    expect(mockRows.get('subscriptions/new-sub').status).toBe('Pending');
  });
  it('only one competing replacement can replace the same active subscription', async () => {
    mockRows.set('subscriptions/old', { subscriptionId: 'old', userId: 'customer', status: 'Active' });
    seed({ replacesSubscriptionId: 'old' });
    mockRows.set('subscriptions/other', { ...mockRows.get('subscriptions/new-sub'), subscriptionId: 'other' });
    const first = response(); const second = response();
    const otherReq = request(); otherReq.params.subscriptionId = 'other';
    await Promise.all([AdminController.acceptSubscription(request(), first), AdminController.acceptSubscription(otherReq, second)]);
    expect([first, second].map(res => res.status.mock.calls[0][0]).sort()).toEqual([200, 409]);
    expect([...mockRows.values()].filter(row => row.status === 'Active')).toHaveLength(1);
  });
  it('lists pending requests to the user while the default active query excludes them', async () => {
    seed();
    mockRows.set('subscriptions/active', { ...mockRows.get('subscriptions/new-sub'), subscriptionId: 'active', status: 'Active', approvalStatus: 'Accepted', endDate: '2099-01-01' });
    expect((await Subscription.getActiveUserSubscriptions('customer')).map(sub => sub.subscriptionId)).toEqual(['active']);
    expect((await Subscription.getActiveUserSubscriptions('customer', true)).map(sub => sub.subscriptionId).sort()).toEqual(['active', 'new-sub']);
  });
});
