create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'operator', 'admin');
create type public.account_status as enum ('active', 'suspended');
create type public.event_status as enum ('draft', 'published', 'cancelled', 'completed');
create type public.booking_status as enum ('awaiting_payment', 'paid', 'confirmed', 'cancelled', 'expired');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'expired', 'refunded');
create type public.gallery_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username is null or username ~ '^[a-zA-Z0-9_]{3,24}$'),
  full_name text not null default '',
  phone text,
  avatar_path text,
  role public.app_role not null default 'customer',
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 3 and 100),
  label text not null default 'EVENT NILA',
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  fish_kg numeric(8,2) not null check (fish_kg > 0),
  price integer not null check (price >= 0),
  total_spots smallint not null default 82 check (total_spots between 1 and 82),
  image_path text,
  status public.event_status not null default 'draft',
  featured boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  event_id uuid not null references public.events(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  spot_number smallint not null check (spot_number between 1 and 82),
  participant_name text not null check (char_length(participant_name) between 3 and 100),
  participant_phone text not null check (participant_phone ~ '^[0-9]{10,15}$'),
  notes text check (notes is null or char_length(notes) <= 180),
  agreed_to_rules_at timestamptz not null,
  amount integer not null check (amount >= 0),
  status public.booking_status not null default 'awaiting_payment',
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index bookings_one_active_spot
  on public.bookings(event_id, spot_number)
  where status in ('awaiting_payment', 'paid', 'confirmed');
create index bookings_user_created_idx on public.bookings(user_id, created_at desc);
create index bookings_event_status_idx on public.bookings(event_id, status);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  provider text not null,
  provider_order_id text unique,
  method text,
  amount integer not null check (amount >= 0),
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  title text not null check (char_length(title) between 3 and 100),
  caption text not null default '',
  category text not null default 'momen',
  image_path text not null,
  status public.gallery_status not null default 'pending',
  is_active boolean not null default true,
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  angler_name text not null,
  fish_weight_kg numeric(6,2) not null check (fish_weight_kg > 0),
  caught_at date not null,
  image_path text,
  notes text not null default '',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  body text not null default '',
  category text not null default 'pengumuman',
  image_path text,
  published_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.venue_settings (
  id boolean primary key default true check (id),
  venue_name text not null default 'Pemancingan Adem Ayem Dlopo',
  opens_at time not null default '06:00',
  closes_at time not null default '22:00',
  fish_mood text not null default 'normal',
  fish_mood_note text not null default 'Kondisi ikan diperbarui oleh pengelola.',
  map_url text not null default 'https://maps.app.goo.gl/cQtnrkjTiAvC5JNC7',
  whatsapp text,
  natural_bait_rule text not null default 'Umpan wajib berasal dari bahan alami. Essen atau pemanis hanya boleh sebagai campuran umpan alami.',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.venue_settings(id) values (true) on conflict do nothing;

insert into public.events (
  id, slug, title, label, description, starts_at, ends_at, fish_kg, price,
  total_spots, status, featured
) values
  (
    '00000000-0000-4000-8000-000000000225', 'grand-mix-babaon-225',
    'Grand Mix Babaon', 'EVENT UTAMA',
    'Event nila utama dengan pelepasan 225 kg ikan nila untuk 82 lapak.',
    '2026-10-04 08:00:00+07', '2026-10-04 13:00:00+07', 225, 100000, 82,
    'published', true
  ),
  (
    '00000000-0000-4000-8000-000000000200', 'nila-200',
    'Pesta Nila 200 KG', 'MANCING BARENG',
    'Mancing bareng dengan pelepasan 200 kg ikan nila untuk 82 lapak.',
    '2026-10-10 15:00:00+07', '2026-10-10 20:00:00+07', 200, 85000, 82,
    'published', false
  ),
  (
    '00000000-0000-4000-8000-000000000150', 'nila-150',
    'Nila Night Strike', 'SESI MALAM',
    'Sesi malam dengan pelepasan 150 kg ikan nila untuk 82 lapak.',
    '2026-10-16 19:00:00+07', '2026-10-16 23:30:00+07', 150, 70000, 82,
    'published', false
  ),
  (
    '00000000-0000-4000-8000-000000000100', 'nila-100',
    'Fun Fishing Nila', 'HARIAN SERU',
    'Fun fishing dengan pelepasan 100 kg ikan nila untuk 82 lapak.',
    '2026-10-25 07:00:00+07', '2026-10-25 11:30:00+07', 100, 50000, 82,
    'published', false
  )
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger gallery_set_updated_at before update on public.gallery_items for each row execute function public.set_updated_at();
create trigger leaderboard_set_updated_at before update on public.leaderboard_entries for each row execute function public.set_updated_at();
create trigger news_set_updated_at before update on public.news_items for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, username, full_name, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('operator', 'admin') and status = 'active'
  );
$$;

create or replace function public.create_booking(
  p_event_id uuid,
  p_spot_number integer,
  p_participant_name text,
  p_participant_phone text,
  p_notes text default null
)
returns table (
  booking_id uuid,
  booking_code text,
  amount integer,
  status public.booking_status,
  expires_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events%rowtype;
  v_booking public.bookings%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_event from public.events
  where id = p_event_id and status = 'published' for update;

  if not found then raise exception 'EVENT_NOT_AVAILABLE'; end if;
  if v_event.starts_at <= now() then raise exception 'EVENT_ALREADY_STARTED'; end if;
  if p_spot_number < 1 or p_spot_number > v_event.total_spots then raise exception 'INVALID_SPOT'; end if;
  if char_length(trim(p_participant_name)) < 3 then raise exception 'INVALID_NAME'; end if;
  if regexp_replace(p_participant_phone, '[^0-9]', '', 'g') !~ '^[0-9]{10,15}$' then
    raise exception 'INVALID_PHONE';
  end if;

  update public.bookings set status = 'expired'
  where event_id = p_event_id and status = 'awaiting_payment' and expires_at <= now();

  begin
    insert into public.bookings (
      booking_code, event_id, user_id, spot_number, participant_name,
      participant_phone, notes, agreed_to_rules_at, amount, status, expires_at
    ) values (
      'NILA-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
      p_event_id, auth.uid(), p_spot_number, trim(p_participant_name),
      regexp_replace(p_participant_phone, '[^0-9]', '', 'g'),
      nullif(trim(coalesce(p_notes, '')), ''), now(), v_event.price,
      'awaiting_payment', now() + interval '15 minutes'
    ) returning * into v_booking;
  exception when unique_violation then
    raise exception 'SPOT_ALREADY_BOOKED';
  end;

  return query select v_booking.id, v_booking.booking_code, v_booking.amount,
    v_booking.status, v_booking.expires_at;
end;
$$;

create or replace function public.get_occupied_spots(p_event_id uuid)
returns table (spot_number smallint)
language sql stable security definer set search_path = '' as $$
  select b.spot_number
  from public.bookings b
  where b.event_id = p_event_id
    and (
      b.status in ('paid', 'confirmed')
      or (b.status = 'awaiting_payment' and b.expires_at > now())
    )
  order by b.spot_number;
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.gallery_items enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.news_items enable row level security;
alter table public.venue_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users read own profile" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_staff());
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Staff manage profiles" on public.profiles for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Published events are public" on public.events for select using (status = 'published' or public.is_staff());
create policy "Staff manage events" on public.events for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Users read own bookings" on public.bookings for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "Users cancel own pending bookings" on public.bookings for update to authenticated
using (user_id = auth.uid() and status = 'awaiting_payment') with check (user_id = auth.uid() and status = 'cancelled');
create policy "Staff manage bookings" on public.bookings for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Users read own payments" on public.payments for select to authenticated
using (exists (select 1 from public.bookings b where b.id = booking_id and (b.user_id = auth.uid() or public.is_staff())));
create policy "Staff manage payments" on public.payments for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Approved gallery is public" on public.gallery_items for select
using ((status = 'approved' and is_active) or user_id = auth.uid() or public.is_staff());
create policy "Users submit gallery" on public.gallery_items for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy "Users edit pending gallery" on public.gallery_items for update to authenticated
using (user_id = auth.uid() and status = 'pending') with check (user_id = auth.uid() and status = 'pending');
create policy "Staff manage gallery" on public.gallery_items for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Active leaderboard is public" on public.leaderboard_entries for select using (is_active or public.is_staff());
create policy "Staff manage leaderboard" on public.leaderboard_entries for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Published news is public" on public.news_items for select using ((is_active and published_at <= now()) or public.is_staff());
create policy "Staff manage news" on public.news_items for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Venue settings are public" on public.venue_settings for select using (true);
create policy "Staff manage settings" on public.venue_settings for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Admins read audit logs" on public.audit_logs for select to authenticated using (public.is_staff());

revoke update on public.profiles from authenticated;
grant update(username, full_name, phone, avatar_path) on public.profiles to authenticated;

revoke all on function public.create_booking(uuid, integer, text, text, text) from public;
grant execute on function public.create_booking(uuid, integer, text, text, text) to authenticated;
revoke all on function public.get_occupied_spots(uuid) from public;
grant execute on function public.get_occupied_spots(uuid) to anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('gallery', 'gallery', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('content', 'content', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Public media is readable" on storage.objects for select using (bucket_id in ('avatars', 'gallery', 'content'));
create policy "Users manage own avatar" on storage.objects for all to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users upload gallery submissions" on storage.objects for insert to authenticated
with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Staff manage all media" on storage.objects for all to authenticated using (public.is_staff()) with check (public.is_staff());
