# Map and brand assets

The interactive map uses OpenStreetMap's HTTPS raster tile URL `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and visible linked attribution to © OpenStreetMap contributors. Tiles are fetched only for the current interactive viewport, with normal browser caching; there is no bulk-download, offline or prefetch feature.

Official policies: https://operations.osmfoundation.org/policies/tiles/ and https://www.openstreetmap.org/copyright. OpenStreetMap data is licensed under ODbL. Public OSM tile service availability is best-effort, not a production SLA; use a licensed provider at higher volume. `NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION` allow a deployment to choose an alternative licensed tile service and its attribution.

`routepool.svg` is a source-controlled original route-and-vehicle mark created for this app. All user and driver avatars use initials or interface icons; there are no third-party personal photographs or unverified identity claims. Lucide icons are supplied by the installed `lucide-react` package.
