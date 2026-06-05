# Photo Architecture

## Canonical Model
- Table: `public.media_assets`
- Storage bucket: `visit-photos`
- Uploader: `src/lib/db/photos.ts`
- Reader:
  - Visit detail: `listVisitPhotos`
  - Invoice detail (customer-visible after photos): `getInvoiceById`

## Storage Path Contract
- Format: `{organization_id}/service_visits/{visit_id}/{date}-{uuid}.{ext}`
- Example:
  - `d2e.../service_visits/9dc.../2026-05-28-<uuid>.jpg`

## Metadata Contract
- `organization_id` (required)
- `service_visit_id` (nullable)
- `issue_id` (nullable)
- `storage_path` (required)
- `photo_type` (`before|after|issue|invoice|job`)
- `customer_visible` (bool)
- `captured_at` (timestamp)
- `uploaded_by` (nullable user id)

## Access Model
- DB RLS:
  - org members can read
  - owner/admin can write
- Storage policies:
  - org access is path-derived from first folder segment (`organization_id`)
  - upload/update constrained to owner/admin membership

## Consolidation Status
- `media_assets` is the active canonical photo store.
- `visit_photos` is retained as a compatibility table only.
- New writes should not mirror into `visit_photos`.
