-- RoutePool PK: role-aware schema, private booking/trip data, and safe public route search.
-- Apply with Supabase CLI or the SQL editor. No service-role key is used by the web client.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid() references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'commuter' check (role in ('driver', 'commuter', 'parent')),
  cnic text not null default '',
  created_at timestamptz not null default now()
);

-- Existing installations may have used an empty-string sentinel. Convert it before
-- making phone nullable and exactly unique (Postgres permits multiple NULL values).
update public.users set phone = null where phone is not null and btrim(phone) = '';
drop index if exists public.users_phone_unique_nonempty;
alter table public.users alter column phone drop not null;
alter table public.users alter column phone drop default;
create unique index if not exists users_phone_unique on public.users (phone);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.users(id) on delete cascade,
  vehicle_type text not null,
  origin text not null,
  destination text not null,
  waypoints text[] not null default '{}',
  coordinates jsonb not null default '[]'::jsonb check (jsonb_typeof(coordinates) = 'array'),
  pickup_time time not null,
  drop_time time not null,
  total_seats integer not null check (total_seats > 0 and total_seats <= 100),
  available_seats integer not null check (available_seats >= 0 and available_seats <= total_seats),
  monthly_fare_pkr numeric(12, 2) not null check (monthly_fare_pkr > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.routes add column if not exists coordinates jsonb;
update public.routes set coordinates = '[]'::jsonb where coordinates is null;
alter table public.routes alter column coordinates set default '[]'::jsonb;
alter table public.routes alter column coordinates set not null;

create index if not exists routes_active_search_idx
  on public.routes (is_active, origin, destination);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  passenger_id uuid not null references public.users(id) on delete cascade,
  passenger_name text not null,
  passenger_phone text not null,
  parent_phone text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  boarding_point text not null,
  attendance text not null default 'waiting' check (attendance in ('waiting', 'boarded', 'dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill direct private display fields for databases created by the first schema.
alter table public.bookings add column if not exists passenger_name text;
alter table public.bookings add column if not exists passenger_phone text;
update public.bookings b
set
  passenger_name = coalesce(nullif(b.passenger_name, ''), u.full_name, 'Passenger'),
  passenger_phone = coalesce(nullif(b.passenger_phone, ''), u.phone, '')
from public.users u
where u.id = b.passenger_id
  and (b.passenger_name is null or b.passenger_phone is null);
update public.bookings set passenger_name = 'Passenger' where passenger_name is null or btrim(passenger_name) = '';
update public.bookings set passenger_phone = '' where passenger_phone is null;
alter table public.bookings alter column passenger_name set not null;
alter table public.bookings alter column passenger_phone set not null;

create unique index if not exists bookings_one_active_request_per_passenger
  on public.bookings (route_id, passenger_id)
  where status in ('pending', 'approved');

create index if not exists bookings_route_status_idx
  on public.bookings (route_id, status);

create table if not exists public.active_trips (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed')),
  current_lat numeric(10, 7) not null check (current_lat between -90 and 90),
  current_lng numeric(10, 7) not null check (current_lng between -180 and 180),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (route_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  -- Signup metadata can create only a commuter or parent profile. Driver promotion
  -- is an explicit admin/service-role action after verification.
  requested_role := case
    when new.raw_user_meta_data ->> 'role' in ('commuter', 'parent')
      then new.raw_user_meta_data ->> 'role'
    else 'commuter'
  end;

  insert into public.users (id, full_name, phone, role)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    requested_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- SECURITY INVOKER is important here: SECURITY DEFINER would make current_user
-- appear as the function owner (often postgres), bypassing the administrator gate.
create or replace function public.protect_user_role()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') not in ('service_role', 'supabase_admin')
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Only an administrator can change a user role';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_user_role_before_update on public.users;
create trigger protect_user_role_before_update
before update on public.users
for each row execute procedure public.protect_user_role();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists routes_touch_updated_at on public.routes;
create trigger routes_touch_updated_at
before update on public.routes
for each row execute procedure public.touch_updated_at();

drop trigger if exists bookings_touch_updated_at on public.bookings;
create trigger bookings_touch_updated_at
before update on public.bookings
for each row execute procedure public.touch_updated_at();

-- This helper is intentionally limited to auth.uid(); profile.phone is not an
-- authentication factor and must never authorize a parent live-data read.
create or replace function public.current_verified_phone()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  with source as (
    select regexp_replace(coalesce(phone, ''), '\D', '', 'g') as digits
    from auth.users
    where id = auth.uid()
      and phone_confirmed_at is not null
  )
  select case
    when digits = '' then null
    when digits like '0092%' then '+' || substr(digits, 3)
    when digits like '92%' then '+' || digits
    when digits like '0%' then '+92' || substr(digits, 2)
    else '+' || digits
  end
  from source;
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_route_driver(candidate_route_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'driver'
     and exists (
       select 1 from public.routes
       where id = candidate_route_id and driver_id = auth.uid()
     );
$$;

create or replace function public.is_parent_for_booking(candidate_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = candidate_booking_id
      and b.status = 'approved'
      and b.parent_phone = public.current_verified_phone()
  );
$$;

create or replace function public.normalize_pakistani_phone(value text)
returns text
language sql
immutable
strict
as $$
  with digits as (select regexp_replace(value, '\D', '', 'g') as value)
  select case
    when value like '0092%' then '+' || substr(value, 3)
    when value like '92%' then '+' || value
    when value like '0%' then '+92' || substr(value, 2)
    else '+' || value
  end
  from digits;
$$;

create or replace function public.validate_booking_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  route_row public.routes%rowtype;
begin
  if auth.uid() is null or new.passenger_id <> auth.uid() then
    raise exception 'A booking must belong to the authenticated passenger';
  end if;
  if public.current_profile_role() not in ('commuter', 'parent') then
    raise exception 'Only commuter or parent profiles can create a booking';
  end if;
  if new.status <> 'pending' or new.attendance <> 'waiting' then
    raise exception 'New bookings must start pending and waiting';
  end if;
  if btrim(coalesce(new.passenger_name, '')) = '' or btrim(coalesce(new.boarding_point, '')) = '' then
    raise exception 'Passenger name and boarding point are required';
  end if;

  new.passenger_name := btrim(new.passenger_name);
  new.boarding_point := btrim(new.boarding_point);
  new.passenger_phone := public.normalize_pakistani_phone(new.passenger_phone);
  new.parent_phone := public.normalize_pakistani_phone(new.parent_phone);
  if new.passenger_phone is null or new.passenger_phone !~ '^\+923\d{9}$'
     or new.parent_phone is null or new.parent_phone !~ '^\+923\d{9}$' then
    raise exception 'Passenger and parent phones must be valid Pakistani mobile numbers';
  end if;

  select * into route_row
  from public.routes
  where id = new.route_id
  for update;

  if not found or not route_row.is_active then
    raise exception 'This route is not accepting bookings';
  end if;
  if route_row.available_seats < 1 then
    raise exception 'This route has no available seats';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_booking_before_insert on public.bookings;
create trigger validate_booking_before_insert
before insert on public.bookings
for each row execute procedure public.validate_booking_insert();

-- Public search returns active routes even when they are full. It never exposes
-- users.phone, users.cnic, booking data, or live trip data.
drop function if exists public.list_public_routes();
create function public.list_public_routes()
returns table (
  id uuid,
  driver_id uuid,
  vehicle_type text,
  origin text,
  destination text,
  waypoints text[],
  coordinates jsonb,
  pickup_time time,
  drop_time time,
  total_seats integer,
  available_seats integer,
  monthly_fare_pkr numeric,
  is_active boolean,
  driver_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.driver_id,
    r.vehicle_type,
    r.origin,
    r.destination,
    r.waypoints,
    r.coordinates,
    r.pickup_time,
    r.drop_time,
    r.total_seats,
    r.available_seats,
    r.monthly_fare_pkr,
    r.is_active,
    u.full_name as driver_name
  from public.routes r
  join public.users u on u.id = r.driver_id and u.role = 'driver'
  where r.is_active = true
  order by r.pickup_time, r.origin;
$$;

-- The only booking-status mutation path. The route row is locked before checking
-- and decrementing seats, preventing an approval race from overselling a route.
create or replace function public.approve_booking(p_booking_id uuid, p_approved boolean)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
  route_row public.routes%rowtype;
begin
  if public.current_profile_role() <> 'driver' then
    raise exception 'Only a driver can approve or reject a booking';
  end if;

  select * into booking_row
  from public.bookings
  where id = p_booking_id
  for update;
  if not found then
    raise exception 'Booking not found';
  end if;

  select * into route_row
  from public.routes
  where id = booking_row.route_id
  for update;
  if not found or route_row.driver_id <> auth.uid() then
    raise exception 'The authenticated driver does not own this route';
  end if;

  if booking_row.status = 'approved' then
    if not p_approved then raise exception 'An approved booking cannot be rejected'; end if;
    return booking_row;
  end if;
  if booking_row.status = 'rejected' then
    if p_approved then raise exception 'A rejected booking cannot be re-approved'; end if;
    return booking_row;
  end if;

  if p_approved then
    if not route_row.is_active or route_row.available_seats < 1 then
      raise exception 'No available seat remains on this route';
    end if;
    update public.routes
    set available_seats = available_seats - 1
    where id = route_row.id;

    update public.bookings
    set status = 'approved'
    where id = booking_row.id
    returning * into booking_row;
  else
    update public.bookings
    set status = 'rejected'
    where id = booking_row.id
    returning * into booking_row;
  end if;

  return booking_row;
end;
$$;

-- Attendance has its own narrow RPC. It locks the booking, verifies the owning
-- driver and approved state, and forbids dropping a booking directly from waiting.
create or replace function public.set_booking_attendance(
  p_booking_id uuid,
  p_attendance text
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
  route_driver_id uuid;
begin
  if public.current_profile_role() <> 'driver' then
    raise exception 'Only a driver can update attendance';
  end if;
  if p_attendance not in ('waiting', 'boarded', 'dropped') then
    raise exception 'Invalid attendance status';
  end if;

  select b.* into booking_row
  from public.bookings b
  where b.id = p_booking_id
  for update;
  if not found then
    raise exception 'Booking not found';
  end if;
  select driver_id into route_driver_id from public.routes where id = booking_row.route_id;
  if route_driver_id is distinct from auth.uid() then
    raise exception 'The authenticated driver does not own this route';
  end if;
  if booking_row.status <> 'approved' then
    raise exception 'Attendance requires an approved booking';
  end if;
  if booking_row.attendance = 'waiting' and p_attendance = 'dropped' then
    raise exception 'A waiting booking must be boarded before it can be dropped';
  end if;

  update public.bookings
  set attendance = p_attendance
  where id = booking_row.id
  returning * into booking_row;
  return booking_row;
end;
$$;

-- Coordinate updates are allowed only during an in-progress trip. Ending a trip
-- may change status while retaining the last coordinates, but may not rewrite them.
create or replace function public.prevent_inactive_trip_coordinate_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and (new.current_lat is distinct from old.current_lat or new.current_lng is distinct from old.current_lng)
     and new.status <> 'in_progress' then
    raise exception 'Trip coordinates can change only while the trip is in progress';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_inactive_trip_coordinate_change on public.active_trips;
create trigger prevent_inactive_trip_coordinate_change
before update on public.active_trips
for each row execute procedure public.prevent_inactive_trip_coordinate_change();

alter table public.users enable row level security;
alter table public.routes enable row level security;
alter table public.bookings enable row level security;
alter table public.active_trips enable row level security;

-- Profiles are private. Column privileges additionally prevent role/CNIC changes
-- through the authenticated browser client, even when the row policy matches.
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
for select to authenticated using (id = auth.uid());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Direct route table access is driver-owned. Public consumers use the safe RPC.
drop policy if exists routes_select_owner on public.routes;
create policy routes_select_owner on public.routes
for select to authenticated using (driver_id = auth.uid());

drop policy if exists routes_insert_driver on public.routes;
create policy routes_insert_driver on public.routes
for insert to authenticated
with check (driver_id = auth.uid() and public.current_profile_role() = 'driver');

drop policy if exists routes_update_owner on public.routes;
create policy routes_update_owner on public.routes
for update to authenticated
using (driver_id = auth.uid())
with check (driver_id = auth.uid() and public.current_profile_role() = 'driver');

drop policy if exists routes_delete_owner on public.routes;
create policy routes_delete_owner on public.routes
for delete to authenticated using (driver_id = auth.uid());

-- Booking reads are limited to the passenger, the route's driver, or a parent
-- whose verified Auth phone matches the normalized booking parent_phone.
drop policy if exists bookings_select_authorized on public.bookings;
create policy bookings_select_authorized on public.bookings
for select to authenticated using (
  passenger_id = auth.uid()
  or public.is_route_driver(route_id)
  or public.is_parent_for_booking(id)
);

drop policy if exists bookings_insert_self on public.bookings;
create policy bookings_insert_self on public.bookings
for insert to authenticated
with check (passenger_id = auth.uid() and status = 'pending' and attendance = 'waiting');

-- No direct booking update/delete policy is provided. Status and attendance changes
-- go through their locked SECURITY DEFINER functions.

-- Live location is private to the route driver, approved passenger, or parent whose
-- verified Auth phone matches the booking parent_phone.
drop policy if exists active_trips_select_authorized on public.active_trips;
create policy active_trips_select_authorized on public.active_trips
for select to authenticated using (
  public.is_route_driver(route_id)
  or exists (
    select 1 from public.bookings b
    where b.route_id = active_trips.route_id
      and b.passenger_id = auth.uid()
      and b.status = 'approved'
  )
  or exists (
    select 1
    from public.bookings b
    where b.route_id = active_trips.route_id
      and b.status = 'approved'
      and b.parent_phone = public.current_verified_phone()
  )
);

drop policy if exists active_trips_insert_driver on public.active_trips;
create policy active_trips_insert_driver on public.active_trips
for insert to authenticated
with check (public.is_route_driver(route_id));

drop policy if exists active_trips_update_driver on public.active_trips;
create policy active_trips_update_driver on public.active_trips
for update to authenticated
using (public.is_route_driver(route_id))
with check (public.is_route_driver(route_id));

drop policy if exists active_trips_delete_driver on public.active_trips;
create policy active_trips_delete_driver on public.active_trips
for delete to authenticated using (public.is_route_driver(route_id));

-- Restrict all callable functions explicitly. Only the public route search is
-- callable by anon; mutation RPCs and policy helpers are authenticated-only.
revoke all on function public.list_public_routes() from public;
grant execute on function public.list_public_routes() to anon, authenticated;
revoke all on function public.approve_booking(uuid, boolean) from public;
grant execute on function public.approve_booking(uuid, boolean) to authenticated;
revoke all on function public.set_booking_attendance(uuid, text) from public;
grant execute on function public.set_booking_attendance(uuid, text) to authenticated;
revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to authenticated;
revoke all on function public.current_verified_phone() from public;
grant execute on function public.current_verified_phone() to authenticated;
revoke all on function public.is_route_driver(uuid) from public;
grant execute on function public.is_route_driver(uuid) to authenticated;
revoke all on function public.is_parent_for_booking(uuid) from public;
grant execute on function public.is_parent_for_booking(uuid) to authenticated;
revoke all on function public.handle_new_user() from public;
revoke all on function public.normalize_pakistani_phone(text) from public;
revoke all on function public.validate_booking_insert() from public;
revoke all on function public.protect_user_role() from public;

revoke update on table public.users from authenticated;
grant update (full_name, phone) on table public.users to authenticated;

-- Realtime delivers only an event; repository subscribers re-fetch through RLS.
alter table public.active_trips replica identity full;
alter table public.bookings replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'active_trips'
  ) then
    alter publication supabase_realtime add table public.active_trips;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
exception
  when undefined_object then
    -- Local Postgres installations may not have Supabase Realtime installed.
    null;
end;
$$;

-- Driver promotion is intentionally an admin-only action after verification:
-- update public.users set role = 'driver' where id = '<auth-user-uuid>';
