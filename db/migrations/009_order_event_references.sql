ALTER TABLE orders ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ticket_type TEXT;

CREATE INDEX IF NOT EXISTS orders_event_idx ON orders (event_id);
