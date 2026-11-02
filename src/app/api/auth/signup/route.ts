import { NextResponse } from "next/server";
import { createSession, createUser } from "@/lib/auth";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Account creation is not configured yet. Set DATABASE_URL and apply the PostgreSQL migrations." }, { status: 503 });
  }

  let body: { fullName?: string; email?: string; password?: string };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "Invalid sign-up request." }, { status: 400 }); }
  const fullName = body.fullName?.trim();
  const email = body.email?.trim();
  const password = body.password ?? "";
  if (!fullName || !email || password.length < 8) return NextResponse.json({ error: "Name, valid email, and an 8-character password are required." }, { status: 400 });

  try {
    const user = await createUser({ fullName, email, password });
    const token = await createSession(user.id);
    const response = NextResponse.json({ user: { id: user.id, name: user.full_name, email: user.email, accountType: user.account_type } }, { status: 201 });
    response.cookies.set("ticketia_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("duplicate key")) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    return NextResponse.json({ error: "Unable to create account. Confirm PostgreSQL is running and the migrations are applied." }, { status: 503 });
  }
}
