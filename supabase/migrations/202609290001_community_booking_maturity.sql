begin;

alter table public.leaderboard_entries add column if not exists fish_count integer not null default 1;
alter table public.leaderboard_entries add column if not exists total_weight_kg numeric(8,2);
update public.leaderboard_entries set total_weight_kg = fish_weight_kg where total_weight_kg is null;
alter table public.leaderboard_entries alter column total_weight_kg set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leaderboard_totals_valid' and conrelid = 'public.leaderboard_entries'::regclass) then
    alter table public.leaderboard_entries add constraint leaderboard_totals_valid
      check (fish_count between 1 and 10000 and total_weight_kg >= fish_weight_kg and (fish_count > 1 or total_weight_kg = fish_weight_kg));
  end if;
end $$;
create index if not exists leaderboard_event_date_idx on public.leaderboard_entries(event_id, caught_at desc) where is_active;

-- Pending or rejected gallery files must not be accessible through a public URL.
update storage.buckets set public = false where id = 'gallery';
drop policy if exists "Public media is readable" on storage.objects;
create policy "Public media is readable" on storage.objects for select
  using (bucket_id in ('avatars', 'content'));
drop policy if exists "Gallery images follow moderation" on storage.objects;
create policy "Gallery images follow moderation" on storage.objects for select
  using (bucket_id = 'gallery' and (
    public.is_staff()
    or (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.gallery_items as item
      where item.status = 'approved' and item.is_active and (
        item.image_path = storage.objects.name
        or item.image_path = 'gallery/' || storage.objects.name
        or split_part(split_part(item.image_path, '/object/public/gallery/', 2), '?', 1) = storage.objects.name
      )
    )
  ));

-- Clients may cancel reservations, but may not edit prices, owners, or spot numbers.
-- Booking owners retain access to their own event details when an event is archived.
drop policy if exists "Booking owners read event history" on public.events;
create policy "Booking owners read event history" on public.events for select to authenticated
  using (exists (select 1 from public.bookings as booking where booking.event_id = events.id and booking.user_id = auth.uid()));

revoke update on public.bookings from authenticated;
grant update(status, cancelled_at) on public.bookings to authenticated;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare item public.bookings;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into item from public.bookings where id = p_booking_id and user_id = auth.uid() for update;
  if not found or item.status <> 'awaiting_payment' then raise exception 'BOOKING_NOT_CANCELLABLE'; end if;
  update public.bookings
    set status = case when item.expires_at <= now() then 'expired'::public.booking_status else 'cancelled'::public.booking_status end,
        cancelled_at = case when item.expires_at <= now() then null else now() end
    where id = item.id;
end;
$$;
revoke all on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated;

create or replace function public.refresh_booking_expirations()
returns integer language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.bookings set status = 'expired'
    where status = 'awaiting_payment' and expires_at <= now()
      and (user_id = auth.uid() or public.is_staff());
  get diagnostics changed = row_count;
  return changed;
end;
$$;
revoke all on function public.refresh_booking_expirations() from public, anon;
grant execute on function public.refresh_booking_expirations() to authenticated;

-- Keep an audit trail without duplicating names, telephone numbers, or photo URLs.
create or replace function public.audit_application_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and to_jsonb(old) - 'updated_at' = to_jsonb(new) - 'updated_at' then return new; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), lower(tg_op), tg_table_name, new.id::text,
      jsonb_strip_nulls(jsonb_build_object('status', to_jsonb(new)->>'status', 'is_active', to_jsonb(new)->'is_active', 'spot_number', to_jsonb(new)->'spot_number')));
  return new;
end;
$$;
revoke all on function public.audit_application_change() from public, anon, authenticated;
drop trigger if exists events_audit_changes on public.events;
create trigger events_audit_changes after insert or update on public.events for each row execute function public.audit_application_change();
drop trigger if exists gallery_audit_changes on public.gallery_items;
create trigger gallery_audit_changes after insert or update on public.gallery_items for each row execute function public.audit_application_change();
drop trigger if exists leaderboard_audit_changes on public.leaderboard_entries;
create trigger leaderboard_audit_changes after insert or update on public.leaderboard_entries for each row execute function public.audit_application_change();
drop trigger if exists bookings_audit_changes on public.bookings;
create trigger bookings_audit_changes after insert or update on public.bookings for each row execute function public.audit_application_change();

notify pgrst, 'reload schema';
commit;
