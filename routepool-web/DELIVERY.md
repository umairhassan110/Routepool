# RoutePool PK handoff

The standalone Next.js application is contained entirely in this folder. It preserves the earlier Expo starter outside the folder. Run the commands in `README.md` from this app root, not the surrounding repository.

The required `/driver`, `/search`, and `/tracking` pages are connected through shared state. The package also includes `/rides`, `/account`, `/help`, and `/auth/callback`, a PostgreSQL migration, a browser-safe optional Supabase adapter, and source-controlled app branding. It uses the requested Next.js App Router, TypeScript, Tailwind, Lucide and React-Leaflet stack.

The no-credential demo is functional and persists locally in the browser. Sample drivers, CNIC verification, seats, trips, notifications and GPS are illustrative records. Booking approval reserves seats in demo state. SOS records a mock event only. No payment is collected and no emergency service is contacted.

The standalone dev listener is separate from the fixed Expo managed Preview. This package is not a second managed WebDev web project in the current task. To deploy on Vercel, import the package as its repository root or use `routepool-web` as the repository Root Directory.

Validation evidence and external-service boundaries are summarized in the final handoff. The real Supabase environment and SMS provider have not been configured or tested here. Apply the SQL to the intended fresh project, set the public environment variables, configure Auth redirects, verify parent phone numbers, assign verified driver roles through operator administration, and rebuild. Real device GPS permission and end-to-end Realtime delivery require a configured project and device test. Browser GPS is not a guaranteed background service.
