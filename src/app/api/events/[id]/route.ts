import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { eventCategories } from "@/lib/event-categories";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user || user.account_type !== "organizer") return NextResponse.json({ error: "Organizer sign-in required." }, { status: 401 });
  let body: { status?: "draft" | "published" | "cancelled"; name?: string; description?: string; date?: string; time?: string; venue?: string; category?: string; imageUrl?: string; tickets?: Array<{ name?: string; price?: number; quantity?: number }> };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "Invalid event update." }, { status: 400 }); }
  if (body.name && body.description && body.date && body.time && body.venue && eventCategories.includes(body.category as typeof eventCategories[number]) && body.tickets) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE events SET name = $1, description = $2, event_date = $3, start_time = $4, venue = $5, category = $6, image_url = COALESCE($7, image_url), updated_at = NOW() WHERE id = $8 AND organizer_id = $9", [body.name.trim(), body.description.trim(), body.date, body.time, body.venue.trim(), body.category, body.imageUrl ?? null, id, user.id]);
      await client.query("DELETE FROM event_ticket_types WHERE event_id = $1", [id]);
      for (const ticket of body.tickets) if (ticket.name && Number(ticket.quantity) > 0 && Number(ticket.price) >= 0) await client.query("INSERT INTO event_ticket_types (event_id, name, price_kes, quantity) VALUES ($1, $2, $3, $4)", [id, ticket.name, Number(ticket.price), Number(ticket.quantity)]);
      await client.query("COMMIT");
      return NextResponse.json({ event: { id, updated: true } });
    } catch { await client.query("ROLLBACK"); return NextResponse.json({ error: "Unable to update event." }, { status: 503 }); } finally { client.release(); }
  }
  if (!body.status) return NextResponse.json({ error: "Complete all event details and choose a valid category, or provide a valid event status." }, { status: 400 });
  const result = await db.query("UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2 AND organizer_id = $3 RETURNING id, status", [body.status, id, user.id]);
  if (!result.rowCount) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json({ event: result.rows[0] });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user || user.account_type !== "organizer") return NextResponse.json({ error: "Organizer sign-in required." }, { status: 401 });
  const result = await db.query(`SELECT e.id, e.name, e.description, e.event_date, e.start_time, e.venue, e.category, e.image_url, json_agg(json_build_object('name', t.name, 'price', t.price_kes, 'quantity', t.quantity)) AS tickets FROM events e LEFT JOIN event_ticket_types t ON t.event_id = e.id WHERE e.id = $1 AND e.organizer_id = $2 GROUP BY e.id`, [id, user.id]);
  if (!result.rowCount) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json({ event: result.rows[0] });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user || user.account_type !== "organizer") return NextResponse.json({ error: "Organizer sign-in required." }, { status: 401 });
  const result = await db.query("DELETE FROM events WHERE id = $1 AND organizer_id = $2 RETURNING id", [id, user.id]);
  if (!result.rowCount) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
