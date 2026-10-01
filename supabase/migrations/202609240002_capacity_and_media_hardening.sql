-- Allow practical avatar uploads while keeping the same client-side 5 MB limit.
update storage.buckets
set file_size_limit = 5242880
where id = 'avatars';

-- An event capacity cannot be reduced below a currently held or sold spot.
create or replace function public.prevent_invalid_event_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.total_spots < old.total_spots and exists (
    select 1
    from public.bookings b
    where b.event_id = new.id
      and b.spot_number > new.total_spots
      and (
        b.status in ('paid', 'confirmed')
        or (b.status = 'awaiting_payment' and b.expires_at > now())
      )
  ) then
    raise exception 'EVENT_CAPACITY_BELOW_ACTIVE_BOOKING';
  end if;
  return new;
end;
$$;

drop trigger if exists events_validate_capacity on public.events;
create trigger events_validate_capacity
before update of total_spots on public.events
for each row execute function public.prevent_invalid_event_capacity();
