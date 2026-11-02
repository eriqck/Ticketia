import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const snapshotKey = process.env.SCANNER_SNAPSHOT_KEY;
  const providedKey = request.headers.get("x-scanner-key");
  if (!snapshotKey || providedKey !== snapshotKey) return NextResponse.json({ error: "Scanner snapshot access denied." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Scanner database is not configured." }, { status: 503 });

  const eventTitle = new URL(request.url).searchParams.get("event");
  if (!eventTitle) return NextResponse.json({ error: "An event is required." }, { status: 400 });

  const result = await db.query<{ ticket_code: string; signed_payload: string; status: string }>(
    `SELECT t.ticket_code, t.signed_payload, t.status
     FROM tickets t JOIN orders o ON o.id = t.order_id
     WHERE o.event_title = $1 AND t.status IN ('issued', 'used')`,
    [eventTitle],
  );

  return NextResponse.json({
    event: eventTitle,
    publicKey: process.env.TICKET_SIGNING_PUBLIC_KEY,
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    tickets: result.rows,
  });
}
