# RoutePool PK outcomes

- [x] **Next.js application and integration setup**
  - Build a complete Next.js App Router application named “RoutePool PK” for monthly pick-and-drop transport pooling and live parent tracking tailored for Pakistan.
  - Use TypeScript, Tailwind CSS, Lucide Icons, and Leaflet.js / React-Leaflet for Maps.
  - Use Supabase (PostgreSQL) with environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Provide fallback mock data so the UI remains fully functional and interactive even if Supabase variables are temporarily unset.
  - Keep the runnable Next.js app compatible with Vercel auto-deploy and avoid missing imports or broken package paths.
  - Evidence: standalone Next.js source, successful TypeScript check, 15 passing tests and optimized production build. This is a standalone source package, not a second managed WebDev web project in the current Expo-bound task.

- [x] **Supabase schema and database-backed behavior — implemented; external connection not verified**
  - Output a SQL migration for `users`: `id` UUID primary key default `gen_random_uuid()`; `full_name` Text; `phone` Text unique; `role` Text with check constraint `'driver'`, `'commuter'`, `'parent'`; `cnic` Text; `created_at` Timestamp default `now()`.
  - Output a SQL migration for `routes`: `id` UUID primary key; `driver_id` UUID referencing `users.id`; `vehicle_type` Text; `origin` Text; `destination` Text; `waypoints` Text[]; `pickup_time` Time; `drop_time` Time; `total_seats` Integer; `available_seats` Integer; `monthly_fare_pkr` Numeric; `is_active` Boolean default `true`.
  - Output a SQL migration for `bookings`: `id` UUID primary key; `route_id` UUID referencing `routes.id`; `passenger_id` UUID referencing `users.id`; `parent_phone` Text; `status` Text with check constraint `'pending'`, `'approved'`, `'rejected'`; `boarding_point` Text.
  - Output a SQL migration for `active_trips`: `id` UUID primary key; `route_id` UUID referencing `routes.id`; `status` Text with check constraint `'scheduled'`, `'in_progress'`, `'completed'`; `current_lat` Numeric; `current_lng` Numeric; `updated_at` Timestamp default `now()`.
  - Evidence: migration, RLS-aware repository, safe public route RPC, atomic booking approval, attendance RPC, verified-phone parent access and trip/booking Realtime subscription source. SQL has not been applied to an external Supabase project here.

- [x] **Driver Portal (`/driver`)**
  - Provide a route publishing form with Origin, Destination, Waypoints, Vehicle Info, Timings, Seat Capacity, and Monthly Fare in PKR.
  - Provide a trip control panel with prominent “START TRIP” (Emerald Green) and “END TRIP” (Red) action buttons.
  - Provide an attendance checklist of booked students with “Boarded” / “Dropped” status toggles.
  - Show the privacy notice exactly: “GPS streaming active ONLY during active trip duration.”
  - Evidence: route form connects to provider and repository; booking decisions reserve seats only on approval. Optional driver browser GPS is gated by authenticated ownership, active trip and explicit device permission; actual device streaming remains unverified.

- [x] **Passenger & Parent Search (`/search`)**
  - Provide search inputs for Pickup Area and University/School Destination, plus filter pills “AC Van”, “Car”, and “Under PKR 10,000”.
  - Show interactive matching driver cards with Driver Name, CNIC Verified Badge, Vehicle Type, Route Path, Timings, Available Seats, and Monthly Fare in PKR (example `PKR 8,500/mo`).
  - Provide a booking modal to request a monthly seat with parent contact fields.
  - Evidence: working local state, route filter regressions, normalized phone validation, configured signed-out public route retrieval and authenticated mutation adapter. Sample CNIC badges are illustrative, not actual identity verification.

- [x] **Parent Live Safety Radar (`/tracking`)**
  - Provide an interactive Leaflet map centered on Islamabad/Rawalpindi, displaying the route polyline and moving vehicle marker.
  - Provide a “Simulate Route Movement” button that updates vehicle coordinates in real time.
  - Show the safety alert stream with “Van arrived at I-8/3 Gate (07:32 AM)”, “Student Boarded successfully (07:35 AM)”, and “Student Dropped safely at Campus Main Gate (08:05 AM)”.
  - Provide a high-visibility pulsing red Emergency SOS button for instant mock emergency location broadcasts.
  - Evidence: client-only React-Leaflet with polyline/marker, fit/zoom/follow controls, 36-second simulator, event stream, attendance updates, completion/stop handling and mock SOS event. No emergency call, SMS or dispatch is sent. Remote live tracking requires authorized session and applied SQL.

- [x] **Islamabad/Rawalpindi sample data and styling**
  - Use Emerald Green `#10B981`, Deep Navy `#0F172A`, and Slate Light `#F8FAFC`.
  - Pre-populate realistic Islamabad/Rawalpindi sample data for I-8, G-10, NUST H-12, FAST, MYU, and Blue Area.
  - Format all pricing in PKR (for example `PKR X,XXX/month`).
  - Evidence: six sample routes, HiAce vehicle label, consistent fare formatter, responsive navigation, panels and form styles.

## External setup still required for a live service

- [ ] Apply the included SQL in the intended Supabase project, configure Auth redirect URLs, Phone Auth/SMS provider and verified driver roles, then verify actual RLS/Reatime behavior with real accounts.
- [ ] Test device GPS permissions and end-to-end active-trip delivery on a real driver device. Browser GPS is not a guaranteed background service.
- [ ] Deploy the source on Vercel and verify the actual deployment. No publish or native release build was performed in this task.

These external operational steps are not blockers for the fully runnable local demo and source handoff; they must not be represented as completed production verification.
