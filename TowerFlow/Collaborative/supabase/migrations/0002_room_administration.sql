-- Owner-only room administration.
-- Apply after 0001_collaboration.sql.

create or replace function public.list_room_members(p_room_id uuid)
returns table(user_id uuid, display_name text, role text, joined_at timestamptz)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_room_member(p_room_id) then
    raise exception 'Room membership required';
  end if;
  return query
    select m.user_id, coalesce(nullif(p.display_name,''),'TowerFlow member'), m.role, m.joined_at
    from public.room_members m
    left join public.profiles p on p.id = m.user_id
    where m.room_id = p_room_id
    order by case m.role when 'owner' then 0 when 'editor' then 1 else 2 end, m.joined_at;
end;
$$;

create or replace function public.list_room_invites(p_room_id uuid)
returns table(
  invite_id uuid, role text, expires_at timestamptz,
  max_uses integer, uses integer, revoked_at timestamptz, created_at timestamptz
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only room owners can manage invitations';
  end if;
  return query
    select i.id, i.role, i.expires_at, i.max_uses, i.uses, i.revoked_at, i.created_at
    from public.room_invites i
    where i.room_id = p_room_id
    order by i.created_at desc;
end;
$$;

create or replace function public.revoke_room_invite(p_room_id uuid, p_invite_id uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only room owners can manage invitations';
  end if;

  update public.room_invites
    set revoked_at = now()
    where id = p_invite_id and room_id = p_room_id and revoked_at is null;

  if not found then
    raise exception 'Invitation not found or already revoked';
  end if;

  insert into public.room_activity(room_id, actor_id, action, details)
    values (p_room_id, auth.uid(), 'invite.revoked', jsonb_build_object('invite_id', p_invite_id));
end;
$$;

create or replace function public.set_room_member_role(
  p_room_id uuid, p_user_id uuid, p_role text
)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_target_role text;
begin
  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only room owners can change member roles';
  end if;
  if p_role not in ('editor','viewer') then
    raise exception 'Role must be editor or viewer';
  end if;

  select role into v_target_role
    from public.room_members
    where room_id = p_room_id and user_id = p_user_id
    for update;
  if not found then raise exception 'Room member not found'; end if;
  if v_target_role = 'owner' then
    raise exception 'Owner role cannot be changed through this function';
  end if;

  update public.room_members set role = p_role
    where room_id = p_room_id and user_id = p_user_id;

  insert into public.room_activity(room_id, actor_id, action, details)
    values (p_room_id, auth.uid(), 'member.role_changed',
      jsonb_build_object('member_id', p_user_id, 'role', p_role));
end;
$$;

create or replace function public.remove_room_member(p_room_id uuid, p_user_id uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_target_role text;
begin
  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only room owners can remove members';
  end if;

  select role into v_target_role
    from public.room_members
    where room_id = p_room_id and user_id = p_user_id
    for update;
  if not found then raise exception 'Room member not found'; end if;
  if v_target_role = 'owner' then
    raise exception 'Owner cannot be removed through this function';
  end if;

  delete from public.room_members where room_id = p_room_id and user_id = p_user_id;
  insert into public.room_activity(room_id, actor_id, action, details)
    values (p_room_id, auth.uid(), 'member.removed', jsonb_build_object('member_id', p_user_id));
end;
$$;

revoke all on function public.list_room_members(uuid) from public, anon;
revoke all on function public.list_room_invites(uuid) from public, anon;
revoke all on function public.revoke_room_invite(uuid,uuid) from public, anon;
revoke all on function public.set_room_member_role(uuid,uuid,text) from public, anon;
revoke all on function public.remove_room_member(uuid,uuid) from public, anon;

grant execute on function public.list_room_members(uuid) to authenticated;
grant execute on function public.list_room_invites(uuid) to authenticated;
grant execute on function public.revoke_room_invite(uuid,uuid) to authenticated;
grant execute on function public.set_room_member_role(uuid,uuid,text) to authenticated;
grant execute on function public.remove_room_member(uuid,uuid) to authenticated;
