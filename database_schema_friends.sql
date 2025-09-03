-- Friends feature schema (run in Supabase SQL editor)

-- Table: friend_requests
create table if not exists public.friend_requests (
  id uuid default gen_random_uuid() primary key,
  requester uuid not null references auth.users(id) on delete cascade,
  recipient uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists uq_friend_requests_pair_pending
  on public.friend_requests (requester, recipient)
  where status = 'pending';

-- Indexes for lookups
create index if not exists idx_friend_requests_requester on public.friend_requests(requester);
create index if not exists idx_friend_requests_recipient on public.friend_requests(recipient);
create index if not exists idx_friend_requests_status on public.friend_requests(status);

alter table public.friend_requests enable row level security;

-- Policies
-- View requests you sent or received
drop policy if exists "view own friend requests" on public.friend_requests;
create policy "view own friend requests" on public.friend_requests
  for select using (
    auth.uid() = requester or auth.uid() = recipient
  );

-- Send a request (as requester)
drop policy if exists "send friend request" on public.friend_requests;
create policy "send friend request" on public.friend_requests
  for insert with check (
    auth.uid() = requester and requester <> recipient
  );

-- Respond to a request (only recipient can update)
drop policy if exists "respond to friend request" on public.friend_requests;
create policy "respond to friend request" on public.friend_requests
  for update using (
    auth.uid() = recipient
  );

-- Optional: cancel your pending request
drop policy if exists "cancel pending request" on public.friend_requests;
create policy "cancel pending request" on public.friend_requests
  for delete using (
    auth.uid() = requester and status = 'pending'
  );

-- Allow either party to delete an accepted friendship (unfriend)
drop policy if exists "unfriend accepted" on public.friend_requests;
create policy "unfriend accepted" on public.friend_requests
  for delete using (
    status = 'accepted' and (auth.uid() = requester or auth.uid() = recipient)
  );

-- A view over accepted friendships for simpler querying (optional)
create or replace view public.accepted_friendships as
  select
    case when requester = auth.uid() then recipient else requester end as friend_id,
    created_at
  from public.friend_requests
  where status = 'accepted' and (requester = auth.uid() or recipient = auth.uid());


