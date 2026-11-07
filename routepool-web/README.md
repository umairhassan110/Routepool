# RoutePool PK

A responsive Next.js App Router application for monthly pick-and-drop route pooling and parent trip tracking in Islamabad and Rawalpindi. Built with TypeScript, Tailwind CSS, Lucide, Leaflet/React-Leaflet and Supabase JS.

## Run locally

Use Node.js 22 and the pinned pnpm version. From this folder:

```bash
corepack prepare pnpm@9.12.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

The development server uses port 3001, deliberately separate from the surrounding task's existing Expo starter. To choose a different standalone listener, run `pnpm exec next dev --hostname 0.0.0.0 --port 3000`. Open your local Next.js server in a browser; `/` redirects to `/tracking`.

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

This source package is independent of Expo. Its root is this folder, not the surrounding Mobile Dev workspace. The current Manus task remains bound to the earlier Expo resource, so it is not a second managed WebDev web project or native app build.

## What is implemented

`/tracking` provides an Islamabad Leaflet map, sample route line, moving van marker, zoom/fit/follow controls, trip progress, passenger/driver details, an alert timeline, route simulation and an in-app mock SOS location event. The simulation takes approximately 36 seconds and emits the requested I-8/3 arrival at 07:32 AM, boarding at 07:35 AM and campus drop at 08:05 AM. It is sample GPS, not a real vehicle feed.

`/search` supports pickup/destination text, AND filter pills for AC Van, Car and Under PKR 10,000, sorting, complete route cards and validated monthly booking requests with parent contact. `/driver` supports all required route publishing fields, optional route coordinate geometry, active trip start/end, booking approval/rejection and Boarded/Dropped attendance controls. `/rides`, `/account` and `/help` connect request status, real Supabase account sessions and safety/privacy information. The shared top role switch navigates Driver, Commuter and Parent views; it does not grant production permissions.

Six realistic sample routes cover I-8, G-10, NUST H-12, FAST, MYU, Blue Area and Rawalpindi areas. All prices use `PKR X,XXX/month`. In demo mode, routes, bookings, attendance and trip state are persisted in browser localStorage. No backend credentials are required. Approval reserves seats locally; pending requests do not decrement availability. Reset sample state from `/account`.

## Connect Supabase

Copy `.env.example` to `.env.local`, then provide your own project's values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
```

Do not put a service-role key in either public variable. Apply `supabase/migrations/001_routepool.sql` to a fresh Supabase project and follow `supabase/README.md` for Auth redirect URLs, driver promotion, parent phone verification, RLS, Realtime and optional route geometry. Rebuild after changing public environment variables.

The client queries safe public route data, loads authorized bookings and active trips when authenticated, saves route/booking/trip changes through RLS-aware operations, and subscribes to trip/attendance updates. Without valid Supabase configuration the app remains a usable local demo. Errors are displayed rather than claiming remote writes succeeded.
A configured signed-out visitor sees the real public route list, not the sample listings. Booking mutations and private trip tracking still require sign-in. Unconfigured or unavailable backend state uses the clearly labelled local demo. Sign in with an authorized profile to load protected bookings and live trips.

A real driver starting a connected trip must provide a permitted browser GPS position. The separate “Share device GPS” control opts into ongoing geolocation updates, throttled to once per five seconds. Sharing stops when the trip ends or the driver page unmounts. HTTPS and location permission are required. Browser geolocation does not provide guaranteed background operation; keep the driver screen open. Device permission and actual end-to-end GPS/Realtime delivery have not been verified without a configured project and real device.

## Vercel deployment

Import the source repository into Vercel and choose **Next.js**. If importing the surrounding repository, set **Root Directory** to `routepool-web`; when using this ZIP as the repository root, leave it at the repository root. Use `pnpm install --frozen-lockfile` and `pnpm build`; let Vercel manage the Next.js output. Add the two public Supabase variables to the desired deployment environment and add the deployed `/auth/callback` URL to Supabase's Auth redirect allowlist.

No Vercel deployment or remote Supabase database migration is executed by this source handoff. An optional production tile provider can be configured with `NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION`; the default OpenStreetMap service is best-effort and not a commercial SLA. Attribution is visible on the map. See `public/ASSETS.md`.

## Safety and production boundaries

Sample “CNIC Verified” badges are illustrative only. No identity/background verification system is implemented. Driver role promotion must be performed by your operator after their verification process. Public search does not expose CNIC, phone or live location. Parent access requires a verified phone associated with an approved booking, not a user-editable profile phone.

The SOS control is an **in-app mock location broadcast**. It does not call or text anyone, notify a parent externally, contact emergency services or dispatch assistance. The app does not collect payment. Operator verification, emergency communications, payments, background GPS, operational monitoring and real-device verification are separate production processes/services.

## Structure

`app/` contains the App Router pages and styles. `components/` contains the shared shell, state provider, map, forms and screens. `lib/` contains typed models, seed data, domain helpers and the Supabase adapter. `supabase/` contains SQL and backend setup notes. `tests/` contains deterministic domain tests. The package includes a pnpm lockfile and never includes private credentials, dependency trees or generated build output.
