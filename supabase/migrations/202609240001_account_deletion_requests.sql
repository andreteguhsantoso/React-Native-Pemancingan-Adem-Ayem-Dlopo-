create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'cancelled', 'rejected', 'completed')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index account_deletion_one_open_request
  on public.account_deletion_requests(user_id)
  where status in ('pending', 'processing');

create trigger account_deletion_set_updated_at
before update on public.account_deletion_requests
for each row execute function public.set_updated_at();

alter table public.account_deletion_requests enable row level security;

create policy "Users read own deletion request"
on public.account_deletion_requests for select to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "Users request account deletion"
on public.account_deletion_requests for insert to authenticated
with check (user_id = auth.uid() and status = 'pending');

create policy "Staff manage deletion requests"
on public.account_deletion_requests for all to authenticated
using (public.is_staff()) with check (public.is_staff());
