ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Business';

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_category_check;
ALTER TABLE events ADD CONSTRAINT events_category_check
  CHECK (category IN ('Music', 'Business', 'Sports', 'Comedy', 'Food', 'Workshops'));
