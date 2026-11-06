create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
begin;
select plan(16);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-4000-8000-000000000001','authenticated','authenticated','towerflow-owner@test.local','',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()),
  ('10000000-0000-4000-8000-000000000002','authenticated','authenticated','towerflow-viewer@test.local','',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()),
  ('10000000-0000-4000-8000-000000000003','authenticated','authenticated','towerflow-outsider@test.local','',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('test.room_a', public.create_room('TowerFlow permission test')::text, true);
select ok(current_setting('test.room_a') is not null, 'owner can create a room');

select set_config('test.invite', public.create_room_invite(
  current_setting('test.room_a')::uuid, 'viewer', now() + interval '1 day', 5
), true);
select ok(length(current_setting('test.invite')) = 64, 'invite token is generated');

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::integer from public.rooms where id=current_setting('test.room_a')::uuid), 0, 'nonmember cannot read private room');
select is(public.accept_room_invite(current_setting('test.invite')), current_setting('test.room_a')::uuid, 'invite acceptance joins intended room');
select is((select role from public.room_members where room_id=current_setting('test.room_a')::uuid and user_id=auth.uid()), 'viewer', 'invite grants viewer role');
select is((select count(*)::integer from public.rooms where id=current_setting('test.room_a')::uuid), 1, 'accepted member can read room');
select throws_ok(
  format('insert into public.room_messages(room_id,user_id,body) values (%L,%L,%L)',
    current_setting('test.room_a'), auth.uid(), 'viewer should not post'),
  '42501', null, 'viewer cannot send messages'
);
select throws_ok(
  format('select public.set_room_member_role(%L,%L,%L)',
    current_setting('test.room_a'), auth.uid(), 'editor'),
  'P0001', 'Only room owners can change member roles', 'viewer cannot change member roles'
);

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select set_config('test.room_c', public.create_room('Outsider private room')::text, true);

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok(
  format('select public.set_room_member_role(%L,%L,%L)',
    current_setting('test.room_a'), '10000000-0000-4000-8000-000000000002', 'editor'),
  'owner can promote viewer to editor'
);
select is((select count(*)::integer from public.list_room_members(current_setting('test.room_a')::uuid)), 2, 'room member list is available to owner');

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok(
  format('insert into public.room_messages(room_id,user_id,body) values (%L,%L,%L)',
    current_setting('test.room_a'), auth.uid(), 'editor can post'),
  'editor can send messages after promotion'
);
select is((select count(*)::integer from public.rooms where id=current_setting('test.room_c')::uuid), 0, 'member cannot read another room');

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok(
  format('select public.revoke_room_invite(%L,%L)',
    current_setting('test.room_a'),
    (select id from public.room_invites where room_id=current_setting('test.room_a')::uuid limit 1)),
  'owner can revoke an invitation'
);
select throws_ok(
  format('select public.set_room_member_role(%L,%L,%L)',
    current_setting('test.room_a'), auth.uid(), 'viewer'),
  'P0001', 'Owner role cannot be changed through this function', 'owner cannot demote own owner account'
);
select throws_ok(
  format('select public.remove_room_member(%L,%L)',
    current_setting('test.room_a'), auth.uid()),
  'P0001', 'Owner cannot be removed through this function', 'owner cannot remove own owner account'
);

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok(
  format('select public.accept_room_invite(%L)', current_setting('test.invite')),
  'P0001', 'Invitation is invalid, expired, revoked, or already used', 'revoked invitation cannot be accepted'
);

select * from finish();
rollback;
