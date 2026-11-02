import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatEventDate } from "@/lib/event-format";

function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Public events are not configured." }, { status: 503 });
  const result = await db.query<{
    name: string;
    event_date: string;
    start_time: string;
    venue: string;
    image_url: string | null;
    category: string | null;
    min_price: number | null;
  }>(
    `SELECT e.name, e.event_date, e.start_time, e.venue, e.image_url,
      e.category, MIN(t.price_kes)::int AS min_price
     FROM events e
     LEFT JOIN event_ticket_types t ON t.event_id = e.id
     WHERE e.status = 'published'
     GROUP BY e.id
     ORDER BY e.event_date ASC`,
  );

  return NextResponse.json({
    events: result.rows.map((event) => ({
      title: event.name,
      slug: slugify(event.name),
      date: formatEventDate(event.event_date),
      time: event.start_time.slice(0, 5),
      location: event.venue,
      category: event.category ?? "Events",
      price: `KSh ${Number(event.min_price ?? 0).toLocaleString()}`,
      amount: Number(event.min_price ?? 0),
      image: event.image_url ?? "",
    })),
  });
}
