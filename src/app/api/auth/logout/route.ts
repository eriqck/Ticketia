import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ticketia_session")?.value;
  if (token && process.env.DATABASE_URL) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.query("DELETE FROM sessions WHERE session_token_hash = $1", [tokenHash]);
  }
  const response = NextResponse.json({ loggedOut: true });
  response.cookies.set("ticketia_session", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
