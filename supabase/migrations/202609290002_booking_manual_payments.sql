begin;

create table if not exists public.payment_settings (
  id boolean primary key default true check (id),
  transfer_enabled boolean not null default false,
  bank_name text not null default '',
  account_number text not null default '',
  account_holder text not null default '',
  booking_hold_minutes integer not null default 30 check (booking_hold_minutes between 15 and 120),
  review_hold_minutes integer not null default 120 check (review_hold_minutes between 15 and 360),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (not transfer_enabled or (char_length(trim(bank_name)) between 2 and 60 and account_number ~ '^[0-9]{5,30}$' and char_length(trim(account_holder)) between 3 and 100))
);
insert into public.payment_settings(id) values (true) on conflict do nothing;
alter table public.payment_settings enable row level security;
drop policy if exists "Members read payment instructions" on public.payment_settings;
create policy "Members read payment instructions" on public.payment_settings for select to authenticated using (true);
drop policy if exists "Admins configure payment instructions" on public.payment_settings;
create policy "Admins configure payment instructions" on public.payment_settings for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'));
grant select on public.payment_settings to authenticated;
grant update(transfer_enabled, bank_name, account_number, account_holder, booking_hold_minutes, review_hold_minutes, updated_by) on public.payment_settings to authenticated;
drop trigger if exists payment_settings_updated on public.payment_settings;
create trigger payment_settings_updated before update on public.payment_settings for each row execute function public.set_updated_at();

alter table public.bookings add column if not exists client_request_id uuid;
alter table public.bookings add column if not exists bank_instructions jsonb;
create unique index if not exists bookings_client_request_idx on public.bookings(user_id, client_request_id) where client_request_id is not null;

create table if not exists public.manual_payment_submissions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  proof_path text not null,
  payer_name text not null check (char_length(trim(payer_name)) between 3 and 100),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  first_submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text not null default '' check (char_length(review_note) <= 500),
  updated_at timestamptz not null default now()
);
alter table public.manual_payment_submissions enable row level security;
drop policy if exists "Owners and staff read payment proof" on public.manual_payment_submissions;
create policy "Owners and staff read payment proof" on public.manual_payment_submissions for select to authenticated
  using (public.is_staff() or exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));
grant select on public.manual_payment_submissions to authenticated;
revoke insert, update, delete on public.manual_payment_submissions from authenticated, anon;
drop trigger if exists manual_payments_updated on public.manual_payment_submissions;
create trigger manual_payments_updated before update on public.manual_payment_submissions for each row execute function public.set_updated_at();

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do nothing;
update storage.buckets set public = false where id = 'payment-proofs';
drop policy if exists "Owners upload private payment proof" on storage.objects;
create policy "Owners upload private payment proof" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Owners and staff read private payment proof" on storage.objects;
create policy "Owners and staff read private payment proof" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and (public.is_staff() or (storage.foldername(name))[1] = auth.uid()::text));

-- Qualified columns prevent collisions with RETURNS TABLE variables such as status.
create or replace function public.create_booking(p_event_id uuid, p_spot_number integer, p_participant_name text, p_participant_phone text, p_notes text default null)
returns table (booking_id uuid, booking_code text, amount integer, status public.booking_status, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_event public.events; v_booking public.bookings;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  perform 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' for update;
  if not found then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select e.* into v_event from public.events e where e.id = p_event_id and e.status = 'published' for update;
  if not found then raise exception 'EVENT_NOT_AVAILABLE'; end if;
  if v_event.starts_at <= now() then raise exception 'EVENT_ALREADY_STARTED'; end if;
  if p_spot_number is null or p_spot_number < 1 or p_spot_number > v_event.total_spots then raise exception 'INVALID_SPOT'; end if;
  if p_participant_name is null or char_length(trim(p_participant_name)) not between 3 and 100 then raise exception 'INVALID_NAME'; end if;
  if p_participant_phone is null or regexp_replace(p_participant_phone, '[^0-9]', '', 'g') !~ '^[0-9]{10,15}$' then raise exception 'INVALID_PHONE'; end if;
  if char_length(coalesce(p_notes, '')) > 180 then raise exception 'INVALID_NOTES'; end if;
  update public.bookings b set status = 'expired' where b.event_id = p_event_id and b.status = 'awaiting_payment' and b.expires_at <= now();
  if (select count(*) from public.bookings b where b.user_id = auth.uid() and b.status = 'awaiting_payment' and b.expires_at > now()) >= 3 then raise exception 'TOO_MANY_RESERVATIONS'; end if;
  begin
    insert into public.bookings(booking_code, event_id, user_id, spot_number, participant_name, participant_phone, notes, agreed_to_rules_at, amount, status, expires_at)
      values ('NILA-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), p_event_id, auth.uid(), p_spot_number,
        trim(p_participant_name), regexp_replace(p_participant_phone, '[^0-9]', '', 'g'), nullif(trim(coalesce(p_notes, '')), ''), now(), v_event.price, 'awaiting_payment', least(v_event.starts_at, now() + interval '15 minutes'))
      returning * into v_booking;
  exception when unique_violation then raise exception 'SPOT_ALREADY_BOOKED'; end;
  return query select v_booking.id, v_booking.booking_code, v_booking.amount, v_booking.status, v_booking.expires_at;
end;
$$;
revoke all on function public.create_booking(uuid, integer, text, text, text) from public, anon;
grant execute on function public.create_booking(uuid, integer, text, text, text) to authenticated;

create or replace function public.reserve_ticket(p_event_id uuid, p_spot_number integer, p_participant_name text, p_participant_phone text, p_notes text, p_request_id uuid)
returns table (booking_id uuid, booking_code text, amount integer, status public.booking_status, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings; v_result record; v_minutes integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_request_id is null then raise exception 'INVALID_REQUEST_ID'; end if;
  -- Serialize retries for one account; the original booking locks the event too.
  perform 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' for update;
  if not found then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select b.* into v_booking from public.bookings b where b.user_id = auth.uid() and b.client_request_id = p_request_id;
  if found then
    if v_booking.event_id <> p_event_id or v_booking.spot_number <> p_spot_number then raise exception 'REQUEST_CONFLICT'; end if;
    if v_booking.status in ('cancelled', 'expired') or (v_booking.status = 'awaiting_payment' and v_booking.expires_at <= now()) then raise exception 'BOOKING_EXPIRED'; end if;
    return query select v_booking.id, v_booking.booking_code, v_booking.amount, v_booking.status, v_booking.expires_at;
    return;
  end if;
  if (select count(*) from public.bookings b where b.user_id = auth.uid() and b.status = 'awaiting_payment' and b.expires_at > now()) >= 3 then raise exception 'TOO_MANY_RESERVATIONS'; end if;
  select * into v_result from public.create_booking(p_event_id, p_spot_number, p_participant_name, p_participant_phone, p_notes);
  select s.booking_hold_minutes into v_minutes from public.payment_settings s where s.id;
  update public.bookings b set client_request_id = p_request_id,
    expires_at = least((select e.starts_at from public.events e where e.id = p_event_id), now() + make_interval(mins => coalesce(v_minutes, 30)))
    where b.id = v_result.booking_id returning b.* into v_booking;
  return query select v_booking.id, v_booking.booking_code, v_booking.amount, v_booking.status, v_booking.expires_at;
end;
$$;
revoke all on function public.reserve_ticket(uuid, integer, text, text, text, uuid) from public, anon;
grant execute on function public.reserve_ticket(uuid, integer, text, text, text, uuid) to authenticated;

create or replace function public.prepare_manual_transfer(p_booking_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings; v_settings public.payment_settings; v_bank jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active') then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select b.* into v_booking from public.bookings b where b.id = p_booking_id and b.user_id = auth.uid() for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.status <> 'awaiting_payment' or v_booking.expires_at <= now() then raise exception 'BOOKING_EXPIRED'; end if;
  if not exists (select 1 from public.events e where e.id = v_booking.event_id and e.status = 'published' and e.starts_at > now()) then raise exception 'EVENT_NOT_AVAILABLE'; end if;
  if v_booking.bank_instructions is not null then return v_booking.bank_instructions; end if;
  select s.* into v_settings from public.payment_settings s where s.id;
  if not v_settings.transfer_enabled then raise exception 'TRANSFER_NOT_ENABLED'; end if;
  v_bank := jsonb_build_object('bank_name', v_settings.bank_name, 'account_number', v_settings.account_number, 'account_holder', v_settings.account_holder);
  update public.bookings b set bank_instructions = v_bank where b.id = v_booking.id;
  return v_bank;
end;
$$;
revoke all on function public.prepare_manual_transfer(uuid) from public, anon;
grant execute on function public.prepare_manual_transfer(uuid) to authenticated;

create or replace function public.submit_manual_payment(p_booking_id uuid, p_proof_path text, p_payer_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings; v_submission public.manual_payment_submissions; v_settings public.payment_settings; v_deadline timestamptz; v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active') then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select b.* into v_booking from public.bookings b where b.id = p_booking_id and b.user_id = auth.uid() for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  select s.* into v_settings from public.payment_settings s where s.id;
  if v_booking.bank_instructions is null then raise exception 'TRANSFER_NOT_ENABLED'; end if;
  if v_booking.status <> 'awaiting_payment' or v_booking.expires_at <= now() then raise exception 'BOOKING_EXPIRED'; end if;
  if not exists (select 1 from public.events e where e.id = v_booking.event_id and e.status = 'published' and e.starts_at > now()) then raise exception 'EVENT_NOT_AVAILABLE'; end if;
  if p_payer_name is null or char_length(trim(p_payer_name)) not between 3 and 100 then raise exception 'INVALID_PAYER_NAME'; end if;
  if p_proof_path is null or p_proof_path not like auth.uid()::text || '/%' or position('..' in p_proof_path) > 0
    or not exists (select 1 from storage.objects o where o.bucket_id = 'payment-proofs' and o.name = p_proof_path) then raise exception 'INVALID_PAYMENT_PROOF'; end if;
  select s.* into v_submission from public.manual_payment_submissions s where s.booking_id = v_booking.id for update;
  if found and v_submission.status = 'approved' then raise exception 'PAYMENT_ALREADY_REVIEWED'; end if;
  if found and v_submission.status = 'pending' then
    if v_submission.proof_path = p_proof_path then return v_submission.id; end if;
    raise exception 'PAYMENT_UNDER_REVIEW';
  end if;
  if v_submission.id is null then
    select least(e.starts_at, now() + make_interval(mins => v_settings.review_hold_minutes)) into v_deadline from public.events e where e.id = v_booking.event_id;
    update public.bookings b set expires_at = greatest(b.expires_at, v_deadline) where b.id = v_booking.id;
    insert into public.manual_payment_submissions(booking_id, proof_path, payer_name) values (v_booking.id, p_proof_path, trim(p_payer_name)) returning id into v_id;
  else
    -- Re-submission does not extend the reservation again.
    update public.manual_payment_submissions s set proof_path = p_proof_path, payer_name = trim(p_payer_name), status = 'pending', submitted_at = now(), reviewed_by = null, reviewed_at = null, review_note = ''
      where s.id = v_submission.id returning s.id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.submit_manual_payment(uuid, text, text) from public, anon;
grant execute on function public.submit_manual_payment(uuid, text, text) to authenticated;

drop function if exists public.review_manual_payment(uuid, boolean, text);
create or replace function public.review_manual_payment(p_submission_id uuid, p_approve boolean, p_note text, p_expected_proof_path text, p_expected_submitted_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings; v_submission public.manual_payment_submissions; v_booking_id uuid;
begin
  if not public.is_staff() then raise exception 'STAFF_REQUIRED'; end if;
  if p_approve is null then raise exception 'INVALID_REVIEW'; end if;
  if char_length(coalesce(p_note, '')) > 500 or (not p_approve and char_length(trim(coalesce(p_note, ''))) < 5) then raise exception 'INVALID_REVIEW_NOTE'; end if;
  select s.booking_id into v_booking_id from public.manual_payment_submissions s where s.id = p_submission_id;
  select b.* into v_booking from public.bookings b where b.id = v_booking_id for update;
  select s.* into v_submission from public.manual_payment_submissions s where s.id = p_submission_id for update;
  if v_submission.id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_submission.proof_path is distinct from p_expected_proof_path or v_submission.submitted_at is distinct from p_expected_submitted_at then raise exception 'PAYMENT_PROOF_CHANGED'; end if;
  if v_submission.status = 'approved' and p_approve then return; end if;
  if v_submission.status <> 'pending' then raise exception 'PAYMENT_ALREADY_REVIEWED'; end if;
  if p_approve then
    if v_booking.status <> 'awaiting_payment' or v_booking.expires_at <= now() then raise exception 'PAYMENT_RESERVATION_EXPIRED'; end if;
    if not exists (select 1 from public.events e where e.id = v_booking.event_id and e.status = 'published' and e.starts_at > now()) then raise exception 'EVENT_NOT_AVAILABLE'; end if;
    insert into public.payments(booking_id, provider, provider_order_id, method, amount, status, paid_at)
      values (v_booking.id, 'manual_transfer', 'manual-' || v_submission.id::text, 'bank_transfer', v_booking.amount, 'paid', now());
    update public.bookings b set status = 'paid' where b.id = v_booking.id;
  end if;
  update public.manual_payment_submissions s set status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(), reviewed_at = now(), review_note = trim(coalesce(p_note, '')) where s.id = v_submission.id;
end;
$$;
revoke all on function public.review_manual_payment(uuid, boolean, text, text, timestamptz) from public, anon;
grant execute on function public.review_manual_payment(uuid, boolean, text, text, timestamptz) to authenticated;

-- All financial writes must use server functions, not editable client-side tables.
create or replace function public.cancel_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select b.* into v_booking from public.bookings b where b.id = p_booking_id and b.user_id = auth.uid() for update;
  if not found or v_booking.status <> 'awaiting_payment' then raise exception 'BOOKING_NOT_CANCELLABLE'; end if;
  if exists (select 1 from public.manual_payment_submissions s where s.booking_id = v_booking.id) then raise exception 'PAYMENT_ALREADY_SUBMITTED'; end if;
  update public.bookings b set status = case when v_booking.expires_at <= now() then 'expired'::public.booking_status else 'cancelled'::public.booking_status end,
    cancelled_at = case when v_booking.expires_at <= now() then null else now() end where b.id = v_booking.id;
end;
$$;
revoke all on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated;

revoke insert, update, delete on public.payments from authenticated, anon;
revoke insert, update, delete on public.bookings from authenticated, anon;
revoke update(status, cancelled_at) on public.bookings from authenticated;
drop trigger if exists manual_payments_audit on public.manual_payment_submissions;
create trigger manual_payments_audit after insert or update on public.manual_payment_submissions for each row execute function public.audit_application_change();
drop trigger if exists payments_audit on public.payments;
create trigger payments_audit after insert or update on public.payments for each row execute function public.audit_application_change();

drop trigger if exists payment_settings_audit on public.payment_settings;
create trigger payment_settings_audit after update on public.payment_settings for each row execute function public.audit_application_change();

notify pgrst, 'reload schema';
commit;
