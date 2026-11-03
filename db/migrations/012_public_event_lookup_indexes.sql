CREATE INDEX IF NOT EXISTS events_published_slug_idx
  ON events (
    (
      LOWER(REGEXP_REPLACE(
        REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-|-$)', '', 'g'
      ))
    )
  )
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS orders_event_ticket_type_idx
  ON orders (event_id, LOWER(ticket_type));
