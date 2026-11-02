import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { recordPaymentEvent } from "@/lib/orders";

function signaturesMatch(rawBody: string, signature: string, secretKey: string) {
  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature");
  const rawBody = await request.text();

  if (!secretKey || !signature || !signaturesMatch(rawBody, signature, secretKey)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string; status?: string } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (event.event && event.data?.reference) {
    const firstDelivery = await recordPaymentEvent({
      event: event.event,
      reference: event.data.reference,
      payload: event,
    });

    if (event.event === "charge.success" && firstDelivery) {
      // Ticket issuance belongs in this same transaction once ticket persistence is connected.
      console.info("Paystack payment confirmed", {
        reference: event.data.reference,
        status: event.data.status,
      });
    }
  }

  return NextResponse.json({ received: true });
}
