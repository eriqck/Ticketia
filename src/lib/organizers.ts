import { db } from "@/lib/db";

export type OrganizerPayout = {
  businessName: string;
  email: string;
  paystackSubaccountCode: string;
};

export async function saveOrganizerPayout(payout: OrganizerPayout) {
  if (!process.env.DATABASE_URL) return;

  await db.query(
    `INSERT INTO organizers (business_name, email, paystack_subaccount_code)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET
       business_name = EXCLUDED.business_name,
       paystack_subaccount_code = EXCLUDED.paystack_subaccount_code,
       payout_status = 'connected',
       updated_at = NOW()`,
    [payout.businessName, payout.email, payout.paystackSubaccountCode],
  );
}

export async function findEventTicket(slug: string, ticketName: string) {
  if (!process.env.DATABASE_URL) return null;

  const result = await db.query<{
    event_id: string;
    event_name: string;
    ticket_name: string;
    ticket_price_kes: number;
    ticket_quantity: number;
    tickets_sold: number;
    paystack_subaccount_code: string;
  }>(
    `SELECT e.id AS event_id,
     e.name AS event_name,
     t.name AS ticket_name,
     t.price_kes AS ticket_price_kes,
     t.quantity AS ticket_quantity,
     COALESCE((
       SELECT COUNT(*)
       FROM tickets tk
       JOIN orders ord ON ord.id = tk.order_id
       WHERE ord.event_id = e.id
         AND ord.ticket_type = t.name
         AND tk.status <> 'void'
     ), 0)::int AS tickets_sold,
     o.paystack_subaccount_code
     FROM events e
     JOIN event_ticket_types t ON t.event_id = e.id
     JOIN users u ON u.id = e.organizer_id
     JOIN organizers o ON LOWER(o.email) = LOWER(u.email)
     WHERE e.status = 'published'
       AND LOWER(REGEXP_REPLACE(
         REGEXP_REPLACE(TRIM(e.name), '[^a-zA-Z0-9]+', '-', 'g'),
         '(^-|-$)', '', 'g'
       )) = LOWER($1)
       AND LOWER(t.name) = LOWER($2)
       AND o.payout_status = 'connected'
     LIMIT 1`,
    [slug, ticketName],
  );

  return result.rows[0] ?? null;
}

export async function findOrganizerPayout(email: string) {
  if (!process.env.DATABASE_URL) return null;
  const result = await db.query<{ business_name: string; email: string; paystack_subaccount_code: string; payout_status: string }>(
    "SELECT business_name, email, paystack_subaccount_code, payout_status FROM organizers WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [email],
  );
  const payout = result.rows[0];
  if (!payout) return null;
  return { businessName: payout.business_name, email: payout.email, subaccountCode: payout.paystack_subaccount_code, status: payout.payout_status };
}
