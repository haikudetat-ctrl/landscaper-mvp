# Mapbox Migration Manual Test Checklist

## Configuration

- Add `NEXT_PUBLIC_MAP_PROVIDER=mapbox`, `NEXT_PUBLIC_MAPBOX_TOKEN`, and `MAPBOX_ACCESS_TOKEN` in local/deployed environment settings.
- Confirm `NEXT_PUBLIC_MAPBOX_TOKEN` is only used for browser map rendering.
- Confirm `MAPBOX_ACCESS_TOKEN` is only used by server actions and API routes.

## Existing Flows

- Existing jobs still load on the dashboard and daily run pages.
- Existing properties with saved `latitude`/`longitude` render on the map.
- Properties with saved `latitude`/`longitude` do not call geocoding again.
- Missing token shows a friendly error message for geocoding or optimization instead of crashing the page.

## Geocoding

- Creating a new property with a complete address can populate coordinates when Mapbox is configured.
- Creating a new property still succeeds if Mapbox geocoding cannot find the address.
- Address autocomplete, if added later, is debounced and does not call Mapbox on every keystroke.

## Route Optimization

- Optimize Today / Generate Route calls Mapbox once per button click.
- Refreshing the route page does not call optimization again.
- Changing jobs/stops and clicking Optimize Route produces a new ordered route result.
- Zero-stop or one-stop route attempts show a friendly message.
- If saved route persistence is added later, verify `provider`, `route_date`, `crew_id`, ordered stop IDs, geometry, distance, duration, raw provider snapshot, and `optimized_at` are stored.

## Map Rendering

- The property map renders with Mapbox GL JS when `NEXT_PUBLIC_MAP_PROVIDER=mapbox` and `NEXT_PUBLIC_MAPBOX_TOKEN` is present.
- The preserved OSM tile map still renders when Mapbox is not selected or the public token is missing.
- Saved or freshly optimized route geometry renders on the map without re-optimizing on page load.
- Current job/property stops render as markers.
- Active/selected stop state is visible.

## External Navigation

- Google Maps link opens with the optimized stop order.
- Apple Maps next-stop link opens to the expected next destination.
- Full Apple Maps origin-to-destination link is treated as best effort; use next-stop handoff for MVP daily navigation.

## Data Compatibility

- Existing route/job flows continue to work without a schema migration.
- Existing OpenRouteService/OSM fallback remains available while Mapbox is verified.
- If durable optimized-route history is required, propose and review a Supabase migration before writing provider metadata to new fields.
