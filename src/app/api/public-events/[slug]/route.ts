import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatEventDate } from "@/lib/event-format";

function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Public events are not configured." }, { status: 503 });
  const { slug } = await params;
  const result = await db.query<{
    id: string;
    name: string;
    description: string;
    event_date: string;
    start_time: string;
    venue: string;
    image_url: string | null;
    category: string;
    organizer_name: string;
    tickets: Array<{ name: string; amount: number; description: string; quantity: number }>;
  }>(
    `SELECT e.id, e.name, e.description, e.event_date, e.start_time, e.venue, e.category, e.image_url,
      u.full_name AS organizer_name,
      COALESCE(json_agg(json_build_object(
        'name', t.name,
        'amount', t.price_kes,
        'description', CASE WHEN t.name = 'VIP' THEN 'Priority entry + lounge access' ELSE 'General admission' END,
        'quantity', t.quantity
      ) ORDER BY t.price_kes) FILTER (WHERE t.id IS NOT NULL), '[]') AS tickets
     FROM events e
     JOIN users u ON u.id = e.organizer_id
     LEFT JOIN event_ticket_types t ON t.event_id = e.id
     WHERE e.status = 'published'
     GROUP BY e.id, u.full_name`,
  );
  const event = result.rows.find((row) => slugify(row.name) === slug);
  if (!event) return NextResponse.json({ event: null });
  return NextResponse.json({
    event: {
      id: event.id,
      slug,
      title: event.name,
      category: event.category,
      description: event.description,
      date: formatEventDate(event.event_date),
      time: event.start_time.slice(0, 5),
      venue: event.venue,
      organizer: event.organizer_name,
      imageUrl: event.image_url,
      hero: event.image_url,
      photos: event.image_url ? [event.image_url] : [],
      tickets: event.tickets,
    },
  });
}
