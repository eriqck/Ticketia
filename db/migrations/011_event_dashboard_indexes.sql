CREATE INDEX IF NOT EXISTS events_organizer_created_idx
  ON events (organizer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_event_status_idx
  ON orders (event_id, status);

CREATE INDEX IF NOT EXISTS tickets_order_status_idx
  ON tickets (order_id, status);
