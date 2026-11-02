import { NextResponse } from "next/server";

export async function GET() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "Paystack is not configured." }, { status: 503 });

  const response = await fetch("https://api.paystack.co/bank?country=kenya&perPage=100", {
    headers: { Authorization: `Bearer ${secretKey}` },
    next: { revalidate: 3600 },
  });
  const payload = (await response.json()) as { status?: boolean; message?: string; data?: Array<{ name: string; code: string }> };
  if (!response.ok || !payload.status) return NextResponse.json({ error: payload.message ?? "Unable to load Kenyan banks." }, { status: 502 });
  return NextResponse.json({ banks: payload.data ?? [] });
}
