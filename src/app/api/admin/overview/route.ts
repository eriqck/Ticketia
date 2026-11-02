import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !process.env.ADMIN_EMAIL || user.email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const result = await db.query(`SELECT e.id, e.name, e.event_date, e.status, u.full_name AS organizer_name, COALESCE((SELECT COUNT(*) FROM tickets tk JOIN orders o ON o.id = tk.order_id WHERE o.event_title = e.name AND tk.status <> 'void'), 0)::int AS tickets_sold, COALESCE((SELECT SUM(o.total_amount_kes) FROM orders o WHERE o.event_title = e.name AND o.status = 'paid'), 0)::int AS revenue_kes FROM events e JOIN users u ON u.id = e.organizer_id ORDER BY e.created_at DESC`);
  return NextResponse.json({ events: result.rows });
}
