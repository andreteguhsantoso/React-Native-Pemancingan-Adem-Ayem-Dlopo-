import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const buyer = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const admin = '33333333-3333-4333-8333-333333333333';
const operator = '44444444-4444-4444-8444-444444444444';
const event = '55555555-5555-4555-8555-555555555555';

test('PostgreSQL booking and private manual-payment lifecycle', { timeout: 120000 }, async (t) => {
  // In-memory PostgreSQL, synthetic identities only; never connects to Supabase.
  const db = new PGlite();
  const migration = async (name) => {
    const sql = await readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8');
    await db.exec(sql.replace('create extension if not exists pgcrypto;', ''));
  };
  const as = async (user, query, params = []) => {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? '']);
    await db.exec(user ? 'set role authenticated' : 'set role anon');
    try { return await db.query(query, params); } finally { await db.exec('reset role'); }
  };
  const reserve = async (user, spot, request = randomUUID()) => (await as(user, 'select * from public.reserve_ticket($1,$2,$3,$4,$5,$6)', [event, spot, 'Pemancing Uji', '081234567890', '', request])).rows[0];
  const prepare = async (id) => (await as(buyer, 'select public.prepare_manual_transfer($1) as bank', [id])).rows[0].bank;
  const upload = async (user, filename = randomUUID()) => {
    const path = `${user}/${filename}.jpg`;
    await as(user, 'insert into storage.objects(bucket_id,name) values ($1,$2)', ['payment-proofs', path]);
    return path;
  };
  const submit = async (id, path, user = buyer) => (await as(user, 'select public.submit_manual_payment($1,$2,$3) as id', [id, path, 'Pengirim Uji'])).rows[0].id;
  const review = async (id, approved, note = '', user = admin) => {
    const proof = (await db.query('select proof_path,submitted_at from public.manual_payment_submissions where id=$1', [id])).rows[0];
    return as(user, 'select public.review_manual_payment($1,$2,$3,$4,$5)', [id, approved, note, proof.proof_path, proof.submitted_at]);
  };
  const expectMessage = (fn, text) => assert.rejects(fn, (error) => error.message.includes(text));

  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, unique(bucket_id,name));
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
      grant usage on schema public,auth,storage to anon,authenticated;
      grant select,insert,update,delete on storage.objects to anon,authenticated;
      alter default privileges in schema public grant all on tables to anon,authenticated;
      alter default privileges in schema public grant usage on sequences to anon,authenticated;
    `);
    await migration('202609180001_initial_schema');
    for (const [id, username] of [[buyer, 'buyer_test'], [other, 'other_test'], [admin, 'admin_test'], [operator, 'operator_test']]) await db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [id, `${username}@example.invalid`, { username, full_name: username }]);
    await db.query("update public.profiles set role='admin' where id=$1", [admin]);
    await db.query("update public.profiles set role='operator' where id=$1", [operator]);
    await db.query("insert into public.events(id,slug,title,starts_at,ends_at,fish_kg,price,total_spots,status) values ($1,'test-manual','Event Uji',now()+interval '3 days',now()+interval '3 days 5 hours',225,100000,82,'published')", [event]);

    await t.test('original booking RPC reproduces screenshot-class error 42702', async () => {
      await assert.rejects(() => as(buyer, 'select * from public.create_booking($1,1,$2,$3)', [event, 'Pemancing Uji', '081234567890']), (error) => error.code === '42702' && error.message.includes('status'));
    });
    await migration('202609240001_account_deletion_requests');
    await migration('202609240002_capacity_and_media_hardening');
    await migration('202609290001_community_booking_maturity');
    await migration('202609290002_booking_manual_payments');
    // The repair migration is safe to rerun without duplicating tables or policies.
    await migration('202609290002_booking_manual_payments');

    await t.test('booking is server-priced, retry-idempotent and exclusive per spot', async () => {
      const key = randomUUID();
      const first = await reserve(buyer, 1, key);
      const retry = await reserve(buyer, 1, key);
      assert.equal(first.amount, 100000);
      assert.equal(first.status, 'awaiting_payment');
      assert.equal(retry.booking_id, first.booking_id);
      assert.match(first.booking_code, /^NILA-\d{6}-[A-F0-9]{10}$/);
      await expectMessage(() => reserve(other, 1), 'SPOT_ALREADY_BOOKED');
      await expectMessage(() => reserve(buyer, 2, key), 'REQUEST_CONFLICT');
      await as(buyer, 'select public.cancel_booking($1)', [first.booking_id]);
    });
    await t.test('legacy clients cannot bypass active-reservation limits', async () => {
      const records = [await reserve(buyer, 2), await reserve(buyer, 3), await reserve(buyer, 4)];
      await expectMessage(() => reserve(buyer, 5), 'TOO_MANY_RESERVATIONS');
      await expectMessage(() => as(buyer, 'select * from public.create_booking($1,5,$2,$3)', [event, 'Pemancing Uji', '081234567890']), 'TOO_MANY_RESERVATIONS');
      for (const item of records) await as(buyer, 'select public.cancel_booking($1)', [item.booking_id]);
    });
    const current = await reserve(buyer, 10);
    await t.test('bank transfer is off until an admin supplies a real-account configuration', async () => {
      await expectMessage(() => prepare(current.booking_id), 'TRANSFER_NOT_ENABLED');
      const denied = await as(buyer, "update public.payment_settings set transfer_enabled=true where id=true returning id");
      assert.equal(denied.rows.length, 0);
      const operatorDenied = await as(operator, "update public.payment_settings set bank_name='Cannot change' where id=true returning id");
      assert.equal(operatorDenied.rows.length, 0);
      await as(admin, "update public.payment_settings set transfer_enabled=true, bank_name='Bank Uji', account_number='0000012345', account_holder='Pemancingan Uji', updated_by=$1 where id=true", [admin]);
      const original = await prepare(current.booking_id);
      assert.equal(original.account_number, '0000012345');
      await as(admin, "update public.payment_settings set account_number='0000054321' where id=true");
      assert.deepEqual(await prepare(current.booking_id), original);
    });
    await t.test('clients cannot mark bookings paid, insert payments, or forge approval', async () => {
      await assert.rejects(() => as(buyer, "update public.bookings set status='paid' where id=$1", [current.booking_id]), (error) => error.code === '42501');
      await assert.rejects(() => as(buyer, "insert into public.payments(booking_id,provider,amount,status) values ($1,'fake',1,'paid')", [current.booking_id]), (error) => error.code === '42501');
      await assert.rejects(() => as(buyer, "insert into public.manual_payment_submissions(booking_id,proof_path,payer_name,status) values ($1,'fake','Buyer','approved')", [current.booking_id]), (error) => error.code === '42501');
      const hidden = await as(other, 'select * from public.bookings where id=$1', [current.booking_id]);
      assert.equal(hidden.rows.length, 0);
      await expectMessage(() => as(other, 'select public.prepare_manual_transfer($1)', [current.booking_id]), 'BOOKING_NOT_FOUND');
    });
    let submission;
    await t.test('proof stays private and pending; retries do not create duplicate records', async () => {
      const foreign = await upload(other);
      await expectMessage(() => submit(current.booking_id, foreign), 'INVALID_PAYMENT_PROOF');
      const path = await upload(buyer);
      await assert.rejects(() => as(other, 'insert into storage.objects(bucket_id,name) values ($1,$2)', ['payment-proofs', `${buyer}/forged.jpg`]), (error) => error.code === '42501');
      assert.equal((await as(other, 'select * from storage.objects where bucket_id=$1 and name=$2', ['payment-proofs', path])).rows.length, 0);
      assert.equal((await as(null, 'select * from storage.objects where bucket_id=$1', ['payment-proofs'])).rows.length, 0);
      submission = await submit(current.booking_id, path);
      assert.equal(await submit(current.booking_id, path), submission);
      const row = (await as(buyer, 'select status,expires_at from public.bookings where id=$1', [current.booking_id])).rows[0];
      assert.equal(row.status, 'awaiting_payment');
      assert.ok(new Date(row.expires_at) > new Date(current.expires_at));
      assert.equal((await as(other, 'select id from public.manual_payment_submissions where id=$1', [submission])).rows.length, 0);
      await expectMessage(() => as(buyer, 'select public.cancel_booking($1)', [current.booking_id]), 'PAYMENT_ALREADY_SUBMITTED');
      await expectMessage(() => review(submission, true, '', buyer), 'STAFF_REQUIRED');
      await expectMessage(() => submit(current.booking_id, `${buyer}/missing.jpg`), 'INVALID_PAYMENT_PROOF');
      await expectMessage(async () => submit(current.booking_id, await upload(buyer)), 'PAYMENT_UNDER_REVIEW');
    });
    await t.test('staff confirmation creates exactly one paid record and a usable ticket', async () => {
      await review(submission, true, 'Dana cocok', operator);
      await review(submission, true);
      const payment = (await as(buyer, 'select * from public.payments where booking_id=$1', [current.booking_id])).rows;
      assert.equal(payment.length, 1);
      assert.equal(payment[0].amount, 100000);
      assert.equal(payment[0].status, 'paid');
      assert.equal((await as(buyer, 'select status from public.bookings where id=$1', [current.booking_id])).rows[0].status, 'paid');
      await expectMessage(() => as(buyer, 'select public.cancel_booking($1)', [current.booking_id]), 'BOOKING_NOT_CANCELLABLE');
    });
    await t.test('rejection is explained; resubmission cannot extend hold repeatedly', async () => {
      const booking = await reserve(buyer, 11);
      await prepare(booking.booking_id);
      const proof = await submit(booking.booking_id, await upload(buyer));
      await expectMessage(() => review(proof, false, 'no'), 'INVALID_REVIEW_NOTE');
      await review(proof, false, 'Nama pengirim belum cocok');
      const oldProof = (await db.query('select proof_path,submitted_at from public.manual_payment_submissions where id=$1', [proof])).rows[0];
      const before = (await as(buyer, 'select expires_at from public.bookings where id=$1', [booking.booking_id])).rows[0].expires_at;
      assert.equal(await submit(booking.booking_id, await upload(buyer)), proof);
      const after = (await as(buyer, 'select expires_at from public.bookings where id=$1', [booking.booking_id])).rows[0].expires_at;
      assert.deepEqual(after, before);
      await expectMessage(() => as(admin, 'select public.review_manual_payment($1,true,$2,$3,$4)', [proof, '', oldProof.proof_path, oldProof.submitted_at]), 'PAYMENT_PROOF_CHANGED');
      await expectMessage(() => as(buyer, 'select public.cancel_booking($1)', [booking.booking_id]), 'PAYMENT_ALREADY_SUBMITTED');
      await review(proof, true);
    });
    await t.test('expired reservations cannot be revived or approved over another buyer', async () => {
      const key = randomUUID();
      const old = await reserve(buyer, 12, key);
      await prepare(old.booking_id);
      const proof = await submit(old.booking_id, await upload(buyer));
      await db.query("update public.bookings set expires_at=now()-interval '1 second' where id=$1", [old.booking_id]);
      await expectMessage(() => reserve(buyer, 12, key), 'BOOKING_EXPIRED');
      const replacement = await reserve(other, 12);
      await expectMessage(() => review(proof, true), 'PAYMENT_RESERVATION_EXPIRED');
      assert.equal((await as(other, 'select status from public.bookings where id=$1', [replacement.booking_id])).rows[0].status, 'awaiting_payment');
      assert.equal((await as(buyer, 'select * from public.payments where booking_id=$1', [old.booking_id])).rows.length, 0);
    });
    await t.test('audit trails omit bank account numbers and private photo paths', async () => {
      const audits = (await as(admin, "select metadata from public.audit_logs where entity_type in ('manual_payment_submissions','payments','payment_settings')")).rows;
      assert.ok(audits.length > 0);
      assert.ok(!JSON.stringify(audits).includes('0000012345'));
      assert.ok(!JSON.stringify(audits).includes('/'));
    });
  } finally { await db.close(); }
});
