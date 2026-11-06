-- TowerFlow collaborative foundation
-- Apply to a Supabase project using the SQL editor or Supabase CLI.
-- All room data is private by default and protected by RLS.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.room_activity (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  token_hash bytea not null unique,
  role text not null check (role in ('editor','viewer')),
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  created_by uuid not null references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists room_members_user_idx on public.room_members(user_id);
create index if not exists room_messages_room_created_idx on public.room_messages(room_id, created_at);
create index if not exists room_activity_room_created_idx on public.room_activity(room_id, created_at desc);

create or replace function public.is_room_member(p_room_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_room(p_room_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid()
      and role in ('owner','editor')
  );
$$;

create or replace function public.create_room(p_name text)
returns uuid language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_room uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 100 then
    raise exception 'Room name must be between 1 and 100 characters';
  end if;
  insert into public.rooms(name, created_by) values (trim(p_name), v_user) returning id into v_room;
  insert into public.room_members(room_id, user_id, role) values (v_room, v_user, 'owner');
  insert into public.room_activity(room_id, actor_id, action, details)
    values (v_room, v_user, 'room.created', jsonb_build_object('name', trim(p_name)));
  return v_room;
end;
$$;

create or replace function public.create_room_invite(
  p_room_id uuid, p_role text default 'viewer',
  p_expires_at timestamptz default (now() + interval '7 days'),
  p_max_uses integer default 10
)
returns text language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_token text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'Only room owners can create invitations';
  end if;
  if p_role not in ('editor','viewer') then raise exception 'Invalid invitation role'; end if;
  if p_max_uses is not null and p_max_uses < 1 then raise exception 'Maximum uses must be positive'; end if;
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into public.room_invites(room_id, token_hash, role, expires_at, max_uses, created_by)
    values (p_room_id, digest(v_token, 'sha256'), p_role, p_expires_at, p_max_uses, auth.uid());
  insert into public.room_activity(room_id, actor_id, action, details)
    values (p_room_id, auth.uid(), 'invite.created', jsonb_build_object('role', p_role, 'expires_at', p_expires_at));
  return v_token;
end;
$$;

create or replace function public.accept_room_invite(p_token text)
returns uuid language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.room_invites%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation'; end if;
  select * into v_invite from public.room_invites
    where token_hash = digest(p_token, 'sha256')
    for update;
  if not found or v_invite.revoked_at is not null
    or (v_invite.expires_at is not null and v_invite.expires_at <= now())
    or (v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses) then
    raise exception 'Invitation is invalid, expired, revoked, or already used';
  end if;
  if exists (select 1 from public.room_members where room_id = v_invite.room_id and user_id = v_user) then
    return v_invite.room_id;
  end if;
  update public.room_invites set uses = uses + 1 where id = v_invite.id;
  insert into public.room_members(room_id, user_id, role)
    values (v_invite.room_id, v_user, v_invite.role)
    on conflict (room_id, user_id) do nothing;
  insert into public.room_activity(room_id, actor_id, action, details)
    values (v_invite.room_id, v_user, 'member.joined', jsonb_build_object('role', v_invite.role));
  return v_invite.room_id;
end;
$$;

create or replace function public.log_room_message()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.room_activity(room_id, actor_id, action, details)
    values (new.room_id, new.user_id, 'message.sent', jsonb_build_object('message_id', new.id));
  return new;
end;
$$;

drop trigger if exists room_message_activity on public.room_messages;
create trigger room_message_activity after insert on public.room_messages
for each row execute function public.log_room_message();

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_messages enable row level security;
alter table public.room_activity enable row level security;
alter table public.room_invites enable row level security;

drop policy if exists "profile self read" on public.profiles;
create policy "profile self read" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profile self insert" on public.profiles;
create policy "profile self insert" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profile self update" on public.profiles;
create policy "profile self update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "members read rooms" on public.rooms;
create policy "members read rooms" on public.rooms for select to authenticated using (public.is_room_member(id));
drop policy if exists "editors update rooms" on public.rooms;
create policy "editors update rooms" on public.rooms for update to authenticated using (public.can_edit_room(id)) with check (public.can_edit_room(id));

drop policy if exists "members read membership" on public.room_members;
create policy "members read membership" on public.room_members for select to authenticated using (public.is_room_member(room_id));

drop policy if exists "members read messages" on public.room_messages;
create policy "members read messages" on public.room_messages for select to authenticated using (public.is_room_member(room_id));
drop policy if exists "editors send messages" on public.room_messages;
create policy "editors send messages" on public.room_messages for insert to authenticated
with check (user_id = auth.uid() and public.can_edit_room(room_id));

drop policy if exists "members read activity" on public.room_activity;
create policy "members read activity" on public.room_activity for select to authenticated using (public.is_room_member(room_id));

-- Invite rows are intentionally inaccessible to clients. Creation, acceptance and
-- revocation are performed through narrowly scoped database functions.
revoke all on public.room_invites from anon, authenticated;
revoke all on function public.create_room(text) from public, anon;
revoke all on function public.create_room_invite(uuid,text,timestamptz,integer) from public, anon;
revoke all on function public.accept_room_invite(text) from public, anon;
grant execute on function public.create_room(text) to authenticated;
grant execute on function public.create_room_invite(uuid,text,timestamptz,integer) to authenticated;
grant execute on function public.accept_room_invite(text) to authenticated;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.can_edit_room(uuid) to authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, update on public.rooms to authenticated;
grant select on public.room_members to authenticated;
grant select, insert on public.room_messages to authenticated;
grant select on public.room_activity to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.room_messages;
exception when duplicate_object then null;
end $$;
