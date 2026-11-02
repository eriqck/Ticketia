import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function getCurrentUser() {
  if (!process.env.DATABASE_URL) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get("ticketia_session")?.value;
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const result = await db.query<{ id: string; full_name: string; email: string; account_type: string }>(
    `SELECT users.id, users.full_name, users.email, users.account_type FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.session_token_hash = $1 AND sessions.expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  return result.rows[0] ?? null;
}
