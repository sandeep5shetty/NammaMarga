-- Run this in Supabase → SQL Editor BEFORE `npm run db:push -- --accept-data-loss`
-- Fixes: invalid input value for enum "EmergencyVehicleType_new": "AMBULANCE"

-- 1) See what is stored (optional)
SELECT "vehicleType"::text AS vehicle_type, COUNT(*)::int AS rows
FROM "RouteRequest"
GROUP BY "vehicleType"::text;

-- 2) Drop enum constraint by storing as plain text temporarily
ALTER TABLE "RouteRequest"
  ALTER COLUMN "vehicleType" TYPE text
  USING "vehicleType"::text;

-- 3) Map legacy values to new ambulance types (or NULL)
UPDATE "RouteRequest"
SET "vehicleType" = CASE "vehicleType"
  WHEN 'AMBULANCE' THEN 'AMBULANCE_BLS'
  WHEN 'FIRE_ENGINE' THEN 'AMBULANCE_BLS'
  WHEN 'PRIVATE_CAR' THEN 'AMBULANCE_BLS'
  WHEN 'POLICE_VEHICLE' THEN 'AMBULANCE_BLS'
  WHEN 'TWO_WHEELER' THEN 'AMBULANCE_BLS'
  ELSE "vehicleType"
END
WHERE "vehicleType" IN (
  'AMBULANCE',
  'FIRE_ENGINE',
  'PRIVATE_CAR',
  'POLICE_VEHICLE',
  'TWO_WHEELER'
);

-- 4) Clean up half-failed Prisma enum rename (safe if it exists)
DROP TYPE IF EXISTS "EmergencyVehicleType_new";

-- After this script succeeds, run in terminal:
--   npm run db:push -- --accept-data-loss
--   npm run db:generate
-- (Stop `npm run dev` first if generate shows EPERM on Windows)
