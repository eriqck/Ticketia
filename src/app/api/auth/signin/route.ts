import { NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Sign-in is not configured yet. Set DATABASE_URL and apply the PostgreSQL migrations." }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "Invalid sign-in request." }, { status: 400 }); }
  if (!body.email || !body.password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  try {
    const user = await authenticateUser(body.email, body.password);
    if (!user || user.account_type !== "organizer") return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    const token = await createSession(user.id);
    const response = NextResponse.json({ user: { id: user.id, name: user.full_name, email: user.email, accountType: user.account_type } });
    response.cookies.set("ticketia_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to sign in. Confirm PostgreSQL is running and the migrations are applied." }, { status: 503 });
  }
}
