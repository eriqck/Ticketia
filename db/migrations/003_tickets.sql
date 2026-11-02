ALTER TABLE orders ADD COLUMN IF NOT EXISTS ticket_quantity INTEGER NOT NULL DEFAULT 1 CHECK (ticket_quantity > 0);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  ticket_code TEXT NOT NULL UNIQUE,
  ticket_type TEXT NOT NULL DEFAULT 'Regular',
  signed_payload TEXT NOT NULL,
  qr_payload TEXT NOT NULL,
  qr_code_data_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'used', 'refunded', 'void')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tickets_order_idx ON tickets (order_id);
CREATE INDEX IF NOT EXISTS tickets_code_idx ON tickets (ticket_code);
