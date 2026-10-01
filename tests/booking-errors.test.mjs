import assert from 'node:assert/strict';
import test from 'node:test';
import { friendlyBookingError } from '../src/lib/booking-errors.ts';

test('ambiguous booking error gives the exact repair migration instead of a generic failure', () => {
  assert.match(friendlyBookingError({ code: '42702', message: 'column reference "status" is ambiguous' }), /202609290002/);
});

test('missing payment RPC and tables give ordered database instructions', () => {
  for (const code of ['PGRST202', 'PGRST205', '42P01', '42703']) assert.match(friendlyBookingError({ code }), /202609290001 lalu 202609290002/);
});

test('payment errors distinguish duplicate, expiry, permissions and network failures', () => {
  assert.match(friendlyBookingError('SPOT_ALREADY_BOOKED'), /lapak berbeda/);
  assert.match(friendlyBookingError('PAYMENT_RESERVATION_EXPIRED'), /Jangan aktifkan tiket/);
  assert.match(friendlyBookingError('STAFF_REQUIRED'), /pengelola/);
  assert.match(friendlyBookingError('Failed to fetch'), /Pesanan Saya/);
});

test('unexpected errors never echo backend payloads or secrets into alerts', () => {
  const message = friendlyBookingError({ code: 'XX000;private-value', message: 'unexpected service_role password: sensitive' });
  assert.ok(!message.includes('password'));
  assert.ok(!message.includes('sensitive'));
  assert.ok(!message.includes(';'));
});
