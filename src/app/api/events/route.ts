import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { eventCategories } from "@/lib/event-categories";

type TicketInput = { name?: string; price?: number; quantity?: number };

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.account_type !== "organizer") return NextResponse.json({ error: "Organizer sign-in required." }, { status: 401 });

  const result = await db.query(
    `WITH ticket_totals AS (
       SELECT event_id, SUM(quantity)::int AS tickets_total
       FROM event_ticket_types
       GROUP BY event_id
     ),
     ticket_sales AS (
       SELECT o.event_id, COUNT(tk.id)::int AS tickets_sold
       FROM orders o
       JOIN tickets tk ON tk.order_id = o.id
       WHERE o.event_id IS NOT NULL AND tk.status <> 'void'
       GROUP BY o.event_id
     ),
     order_sales AS (
       SELECT event_id, SUM(total_amount_kes)::int AS revenue_kes
       FROM orders
       WHERE event_id IS NOT NULL AND status = 'paid'
       GROUP BY event_id
     )
     SELECT e.id, e.name, e.description, e.event_date, e.start_time, e.venue,
       CASE WHEN e.event_date < CURRENT_DATE THEN 'expired'
         WHEN e.status = 'published'
           AND COALESCE(ts.tickets_sold, 0) >= COALESCE(tt.tickets_total, 0)
           AND COALESCE(tt.tickets_total, 0) > 0 THEN 'sold_out'
         ELSE e.status END AS status,
       COALESCE(tt.tickets_total, 0)::int AS tickets_total,
       COALESCE(ts.tickets_sold, 0)::int AS tickets_sold,
       COALESCE(os.revenue_kes, 0)::int AS revenue_kes,
       0::int AS scans
     FROM events e
     LEFT JOIN ticket_totals tt ON tt.event_id = e.id
     LEFT JOIN ticket_sales ts ON ts.event_id = e.id
     LEFT JOIN order_sales os ON os.event_id = e.id
     WHERE e.organizer_id = $1
     ORDER BY e.created_at DESC`,
    [user.id],
  );

  return NextResponse.json({ organizerName: user.full_name, events: result.rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.account_type !== "organizer") return NextResponse.json({ error: "Organizer sign-in required." }, { status: 401 });
  let body: { name?: string; description?: string; date?: string; time?: string; venue?: string; category?: string; imageUrl?: string; tickets?: TicketInput[] };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "Invalid event request." }, { status: 400 }); }
  const tickets = (body.tickets ?? []).filter((ticket) => ticket.name && Number.isInteger(Number(ticket.price)) && Number(ticket.price) >= 0 && Number.isInteger(Number(ticket.quantity)) && Number(ticket.quantity) > 0);
  if (!body.name || !body.description || !body.date || !body.time || !body.venue || !eventCategories.includes(body.category as typeof eventCategories[number]) || tickets.length === 0) return NextResponse.json({ error: "Event details, category, and at least one valid ticket type are required." }, { status: 400 });

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const eventResult = await client.query<{ id: string }>(
      `INSERT INTO events (organizer_id, name, slug, description, event_date, start_time, venue, category, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [user.id, body.name.trim(), body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), body.description.trim(), body.date, body.time, body.venue.trim(), body.category, body.imageUrl ?? null],
    );
    for (const ticket of tickets) await client.query("INSERT INTO event_ticket_types (event_id, name, price_kes, quantity) VALUES ($1, $2, $3, $4)", [eventResult.rows[0].id, ticket.name, Number(ticket.price), Number(ticket.quantity)]);
    await client.query("COMMIT");
    return NextResponse.json({ eventId: eventResult.rows[0].id, status: "draft" }, { status: 201 });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Unable to save event draft." }, { status: 503 });
  } finally { client.release(); }
}
