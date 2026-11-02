CREATE TABLE IF NOT EXISTS ticket_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  result TEXT NOT NULL CHECK (result IN ('valid', 'already_used', 'refunded', 'invalid')),
  device_id TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_scans_ticket_idx ON ticket_scans (ticket_id);
