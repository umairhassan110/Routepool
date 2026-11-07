# RoutePool PK Supabase backend

## Setup

1. Create a Supabase project and apply `migrations/001_routepool.sql` with the Supabase CLI or SQL editor.
2. Configure the Next.js app with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The browser adapter uses only the public anon key; never put a service-role key in the app.
3. Enable email/password authentication and SMS phone verification. The `on_auth_user_created` trigger creates the matching `public.users` profile.
4. Pass only a display name, phone, and `role` metadata value of `commuter` or `parent` at signup. Empty metadata phone values become `NULL`; any other requested role, including `driver`, becomes `commuter`.

Example client-side signup metadata:

```ts
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name, phone, role: "commuter" },
  },
});
```

The trigger uses the Auth user's UUID as `public.users.id`, so profile and Auth identity remain linked. If a project already contains Auth users created before this migration, insert their profile rows in an admin context using the same Auth UUIDs.

## Driver verification and promotion

Drivers cannot self-escalate through signup metadata. After verifying a driver outside this demo sample, an administrator should run the following in the Supabase SQL editor or another trusted admin context:

```sql
update public.users
set role = 'driver'
where id = '<authenticated-user-uuid>';
```

The role-protection trigger is `SECURITY INVOKER`, so a normal authenticated browser request cannot change `role`. Only the service/admin role or a trusted administrator SQL context can promote a driver. Authenticated clients have column-level UPDATE privileges only for `full_name` and `phone`; `role` and `cnic` cannot be escalated or edited from the browser.

## Phones and parent authorization

`public.users.phone` is nullable and uniquely indexed. It is profile metadata, not proof of identity. Parent access to private bookings and live trips requires the current `auth.users.phone` to be non-null and SMS-verified (`phone_confirmed_at is not null`). The database helper `current_verified_phone()` normalizes that Auth phone to the `+92...` form and uses only `auth.uid()`; it never trusts `public.users.phone`.

Therefore an email-only account, or a profile with a self-declared phone that is not verified in Supabase Auth, cannot read parent-linked bookings or live trip coordinates. The parent must complete Auth SMS verification and use the same normalized number stored as the booking's `parent_phone`.

## Public routes and RLS

The four tables are `users`, `routes`, `bookings`, and `active_trips`. Row Level Security is enabled on all of them.

- `users` is private to the matching authenticated user. CNIC and profile phone are not part of public route search. Authenticated column privileges allow updates only to `full_name` and `phone`.
- Direct `routes` table access is driver-owned. Public route search uses the tightly constrained `list_public_routes()` `SECURITY DEFINER` function, which returns every active route, including full routes, plus driver display name and stored route coordinates. Inactive routes are returned to their owning driver through the RLS-protected table query.
- New bookings can be inserted only by the authenticated user's `commuter` or `parent` profile. A trigger requires non-empty strings, valid Pakistani passenger/parent mobile numbers, `waiting` attendance, and a pending status; it normalizes both phones and locks the route while checking an available seat. A partial unique index prevents duplicate pending/approved requests for the same passenger and route.
- Booking rows keep `passenger_name` and `passenger_phone` directly on the private booking record. This avoids relying on a profile join when an owning driver reads passengers. RLS limits reads to the passenger, owning driver, or parent with the verified Auth phone.
- Drivers cannot update booking status directly. `approve_booking(uuid, boolean)` locks the booking and route and decrements `available_seats` exactly once on approval. Attendance uses the separate `set_booking_attendance(uuid, text)` RPC, which allows only the owning driver, approved bookings, and valid attendance values; a waiting booking cannot be dropped directly.
- Live trip reads are limited to the route driver, an approved passenger on that route, or a parent with the verified Auth phone. Only the route driver can write trip rows and coordinates. Coordinates can change only while `status = 'in_progress'`; ending a trip must retain the last coordinates, and repository updates also guard against an end/update race.

All `SECURITY DEFINER` RPCs and helpers have explicit grants. Anonymous callers can execute only `list_public_routes()`; mutation functions and private helpers are authenticated-only. The browser never uses a service-role key.

## Realtime

The migration adds both `active_trips` and `bookings` to the `supabase_realtime` publication with full replica identity when that publication exists. Trip subscribers can consume authorized trip events. Booking subscribers treat the event payload only as an identifier and re-fetch the booking through RLS before invoking their callback, so private passenger and parent fields are not trusted from an unfiltered realtime payload. Clients should unsubscribe when the relevant screen unmounts.

## Repository expectations

`lib/repository.ts` is a remote-only adapter. When Supabase is configured, public route search works without a session and returns safe routes with `bookings: []`, `trips: []`, and `profile: null`. Authenticated operations first load the profile once, then surface missing profiles, RLS failures, RPC failures, and structured Supabase error messages rather than converting them into successful-looking local writes.

The adapter returns safe empty/default values for UI-only fields such as driver phone, vehicle plate, rating, and trip progress. Route coordinates are accepted only as finite latitude/longitude pairs in valid bounds; malformed geometry becomes an empty coordinate list and invalid route drafts are rejected. GPS data remains limited to active trips and should have an explicit retention policy before production use.
