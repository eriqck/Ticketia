ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE events
SET slug = LOWER(REGEXP_REPLACE(
  REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-', 'g'),
  '(^-|-$)', '', 'g'
))
WHERE slug IS NULL;

CREATE INDEX IF NOT EXISTS events_published_slug_lookup_idx
  ON events (slug)
  WHERE status = 'published';
