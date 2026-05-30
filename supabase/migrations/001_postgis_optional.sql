-- Optional PostGIS enhancement for Supabase
-- Run in Supabase SQL Editor after enabling PostGIS extension

CREATE EXTENSION IF NOT EXISTS postgis;

-- Example: add geography column to issues (run manually if adopting PostGIS fully)
-- ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS location geography(Point, 4326);
-- UPDATE "Issue" SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography;
-- CREATE INDEX IF NOT EXISTS issue_location_gix ON "Issue" USING GIST (location);

-- Duplicate detection query example:
-- SELECT id, title FROM "Issue"
-- WHERE ST_DWithin(
--   location,
--   ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
--   50
-- ) AND type = :type AND status NOT IN ('VERIFIED','REJECTED','MERGED');
