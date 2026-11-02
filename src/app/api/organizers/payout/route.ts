import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { findOrganizerPayout } from "@/lib/organizers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.account_type !== "organizer") return NextResponse.json({ error: "Organizer sign-in required." }, { status: 401 });
  const payout = await findOrganizerPayout(user.email);
  return NextResponse.json({ payout });
}
