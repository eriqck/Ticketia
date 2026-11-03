import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatEventDate } from "@/lib/event-format";

function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Public events are not configured." }, { status: 503 });
  const searchParams = new URL(request.url).searchParams;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "12", 10) || 12));
  const category = searchParams.get("category")?.trim() || null;
  const search = searchParams.get("search")?.trim() || null;
  const offset = (page - 1) * limit;
  const result = await db.query<{
    name: string;
    event_date: string;
    start_time: string;
    venue: string;
    image_url: string | null;
    category: string | null;
    min_price: number | null;
    total_count: number;
  }>(
    `SELECT e.name, e.event_date, e.start_time, e.venue, e.image_url,
      e.category, MIN(t.price_kes)::int AS min_price,
      COUNT(*) OVER ()::int AS total_count
     FROM events e
     LEFT JOIN event_ticket_types t ON t.event_id = e.id
     WHERE e.status = 'published'
       AND e.event_date >= CURRENT_DATE
       AND ($1::text IS NULL OR e.category = $1)
       AND ($2::text IS NULL OR (
         e.name ILIKE '%' || $2 || '%'
         OR e.venue ILIKE '%' || $2 || '%'
         OR e.category ILIKE '%' || $2 || '%'
       ))
     GROUP BY e.id
     ORDER BY e.event_date ASC, e.id ASC
     LIMIT $3 OFFSET $4`,
    [category === "All events" ? null : category, search, limit, offset],
  );

  const total = result.rows[0]?.total_count ?? 0;
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
    pagination: {
      page,
      limit,
      total,
      hasNextPage: offset + result.rows.length < total,
    },
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}
