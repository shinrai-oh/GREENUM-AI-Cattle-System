-- Merge all data from farm_id=2 into farm_id=1, then remove farm_id=2
-- Safe migration: updates pens, cameras, cattle; behavior_data and daily_statistics
-- reference cattle/pens, so no direct farm_id changes needed.

START TRANSACTION;

-- Optional: ensure target farm exists
-- If not exists, abort
-- SELECT COUNT(*) FROM farms WHERE id IN (1,2);

-- Update pens to belong to farm 1
UPDATE pens SET farm_id = 1 WHERE farm_id = 2;

-- Update cameras to belong to farm 1
UPDATE cameras SET farm_id = 1 WHERE farm_id = 2;

-- Update cattle to belong to farm 1
UPDATE cattle SET farm_id = 1 WHERE farm_id = 2;

-- Remove farm 2 record after migration
DELETE FROM farms WHERE id = 2;

COMMIT;

-- Verification (optional; will not stop the script)
-- SELECT id, name, address FROM farms;
-- SELECT COUNT(*) AS pens_farm1 FROM pens WHERE farm_id = 1;
-- SELECT COUNT(*) AS cameras_farm1 FROM cameras WHERE farm_id = 1;
-- SELECT COUNT(*) AS cattle_farm1 FROM cattle WHERE farm_id = 1;

