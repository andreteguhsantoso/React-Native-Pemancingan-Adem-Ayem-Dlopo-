import assert from 'node:assert/strict';
import test from 'node:test';

import { effectiveBookingStatus, isSold, matchesLeaderboardPeriod, normalizeDate, parseDecimal, wibDateKey } from '../src/lib/domain.ts';
import { galleryObjectPath, imageMimeFromBytes, resolveMediaUrl } from '../src/lib/media-validation.ts';

test('upload guard rejects the exact 14-byte File not found regression', () => {
  assert.equal(imageMimeFromBytes(new TextEncoder().encode('File not found')), null);
  assert.equal(imageMimeFromBytes(new TextEncoder().encode('x'.repeat(300))), null);
});

test('upload guard recognizes supported image signatures', () => {
  const jpeg = new Uint8Array(256); jpeg.set([255, 216, 255]);
  const png = new Uint8Array(256); png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const webp = new Uint8Array(256); webp.set(new TextEncoder().encode('RIFF')); webp.set(new TextEncoder().encode('WEBP'), 8);
  assert.equal(imageMimeFromBytes(jpeg), 'image/jpeg');
  assert.equal(imageMimeFromBytes(png), 'image/png');
  assert.equal(imageMimeFromBytes(webp), 'image/webp');
});

test('media resolver handles object paths, prefixed paths and absolute URLs', () => {
  const url = 'https://test.supabase.co';
  assert.equal(resolveMediaUrl(url, 'content', 'user/photo.jpg'), `${url}/storage/v1/object/public/content/user/photo.jpg`);
  assert.equal(resolveMediaUrl(url, 'content', 'content/user/photo.jpg'), `${url}/storage/v1/object/public/content/user/photo.jpg`);
  assert.equal(resolveMediaUrl(url, 'content', 'https://photo.example/image.jpg'), 'https://photo.example/image.jpg');
  assert.equal(resolveMediaUrl(url, 'content', 'user/foto nila.jpg'), `${url}/storage/v1/object/public/content/user/foto%20nila.jpg`);
  assert.equal(resolveMediaUrl(url, 'content', 'user/foto%20nila.jpg'), `${url}/storage/v1/object/public/content/user/foto%20nila.jpg`);
});

test('media resolver rejects traversal, empty values and non-image protocols', () => {
  assert.equal(resolveMediaUrl('https://test.supabase.co', 'content', '../file.jpg'), null);
  assert.equal(resolveMediaUrl('https://test.supabase.co', 'content', '%2E%2E/file.jpg'), null);
  assert.equal(resolveMediaUrl('https://test.supabase.co', 'content', 'javascript:alert(1)'), null);
  assert.equal(resolveMediaUrl('', 'content', 'user/file.jpg'), null);
  assert.equal(resolveMediaUrl('https://test.supabase.co', 'content', null), null);
});

test('payment proofs can never become a public media URL', () => {
  assert.equal(resolveMediaUrl('https://test.supabase.co', 'payment-proofs', 'user/proof.jpg'), null);
  assert.equal(resolveMediaUrl('https://test.supabase.co', 'payment-proofs', 'https://test.supabase.co/storage/v1/object/public/payment-proofs/user/proof.jpg'), null);
});

test('private gallery normalizes own storage URLs but never signs external hosts', () => {
  const url = 'https://test.supabase.co';
  assert.equal(galleryObjectPath(url, 'gallery/user/a.jpg'), 'user/a.jpg');
  assert.equal(galleryObjectPath(url, `${url}/storage/v1/object/public/gallery/user/a.jpg`), 'user/a.jpg');
  assert.equal(galleryObjectPath(url, `${url}/storage/v1/object/sign/gallery/user/a.jpg?token=expired`), 'user/a.jpg');
  assert.equal(galleryObjectPath(url, 'https://other.example/storage/v1/object/public/gallery/user/a.jpg'), null);
  assert.equal(galleryObjectPath(url, '../a.jpg'), null);
});

test('calendar validates actual dates, including leap years and unpadded user input', () => {
  assert.equal(normalizeDate('2026-4-27'), '2026-04-27');
  assert.equal(normalizeDate('2026-02-29'), null);
  assert.equal(normalizeDate('2028-02-29'), '2028-02-29');
  assert.equal(normalizeDate('2026-04-31'), null);
  assert.equal(normalizeDate('2026-13-01'), null);
  assert.equal(parseDecimal('3,82'), 3.82);
  assert.equal(parseDecimal('3.82'), 3.82);
});

test('leaderboard uses WIB at day/month rollover, not device time zone', () => {
  const now = new Date('2026-09-30T18:00:00Z');
  assert.equal(wibDateKey(now), '2026-10-01');
  assert.equal(matchesLeaderboardPeriod('2026-10-01', 'Hari Ini', null, 'all', now), true);
  assert.equal(matchesLeaderboardPeriod('2026-09-30', 'Hari Ini', null, 'all', now), false);
  assert.equal(matchesLeaderboardPeriod('2026-09-15', 'Bulanan', null, 'all', now), false);
  assert.equal(matchesLeaderboardPeriod('2026-10-01', 'Bulanan', null, 'all', now), true);
});

test('event leaderboard filters only selected event while all includes unlinked records', () => {
  assert.equal(matchesLeaderboardPeriod('2026-08-01', 'Per Event', 'event-1', 'event-1'), true);
  assert.equal(matchesLeaderboardPeriod('2026-08-01', 'Per Event', 'event-2', 'event-1'), false);
  assert.equal(matchesLeaderboardPeriod('2026-08-01', 'Per Event', null, 'all'), true);
});

test('expired reservation is never presented as paid or active', () => {
  const now = Date.parse('2026-09-29T05:00:00Z');
  assert.equal(effectiveBookingStatus('awaiting_payment', '2026-09-29T04:59:59Z', now), 'expired');
  assert.equal(effectiveBookingStatus('awaiting_payment', '2026-09-29T05:00:00Z', now), 'expired');
  assert.equal(effectiveBookingStatus('awaiting_payment', '2026-09-29T05:01:00Z', now), 'awaiting_payment');
  assert.equal(effectiveBookingStatus('paid', '2026-09-29T04:59:59Z', now), 'paid');
  assert.equal(isSold('awaiting_payment'), false);
  assert.equal(isSold('expired'), false);
  assert.equal(isSold('paid'), true);
  assert.equal(isSold('confirmed'), true);
});
