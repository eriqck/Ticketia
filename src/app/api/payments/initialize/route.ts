import { NextResponse } from "next/server";
import { getPaystackSplitConfig } from "@/lib/payments";
import { findEventTicket } from "@/lib/organizers";
import { addPaymentAttempt, createPendingOrder } from "@/lib/orders";

const paystackUrl = "https://api.paystack.co/transaction/initialize";

type InitializeRequest = {
  email?: string;
  phone?: string;
  eventTitle?: string;
  eventSlug?: string;
  ticketName?: string;
  amount?: number;
  quantity?: number;
};

export async function POST(request: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json(
      { error: "Paystack is not configured. Add PAYSTACK_SECRET_KEY to the server environment." },
      { status: 503 },
    );
  }

  let body: InitializeRequest;
  try {
    body = (await request.json()) as InitializeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const phone = body.phone?.replace(/\s+/g, "");
  const email = body.email?.trim();
  const quantity = Number(body.quantity ?? 1);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10 || !phone || !email || !body.eventSlug || !body.ticketName) {
    return NextResponse.json(
      { error: "A valid phone number, email, event, ticket type, and quantity are required." },
      { status: 400 },
    );
  }

  const eventTicket = await findEventTicket(body.eventSlug, body.ticketName);
  if (!eventTicket) {
    return NextResponse.json(
      { error: "This event or ticket type is unavailable." },
      { status: 404 },
    );
  }

  const remaining = eventTicket.ticket_quantity - eventTicket.tickets_sold;
  if (quantity > remaining) return NextResponse.json({ error: "Not enough tickets remain for this ticket type." }, { status: 409 });

  const amount = eventTicket.ticket_price_kes * quantity;
  const { quote, split } = getPaystackSplitConfig(amount, eventTicket.paystack_subaccount_code);

  const reference = `ticketia_${crypto.randomUUID()}`;
  await createPendingOrder({ reference, eventId: eventTicket.event_id, eventTitle: eventTicket.event_name, ticketType: eventTicket.ticket_name, email, phone, quote, quantity });
  const response = await fetch(paystackUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: quote.customerTotal * 100,
      currency: "KES",
      email,
      reference,
      channels: ["mobile_money"],
      subaccount: split.subaccount,
      transaction_charge: split.transaction_charge,
      bearer: split.bearer,
      metadata: {
        event_title: eventTicket.event_name,
        event_slug: body.eventSlug,
        ticket_type: eventTicket.ticket_name,
        phone,
        ticket_amount: quote.ticketAmount,
        ticketia_fee: quote.platformFee,
        processing_fee_estimate: quote.processingFee,
        organizer_amount: quote.organizerAmount,
        source: "ticketia-web",
      },
    }),
  });

  const payload = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; access_code?: string; reference?: string };
  };

  if (!response.ok || !payload.status || !payload.data?.authorization_url) {
    return NextResponse.json(
      { error: payload.message ?? "Paystack could not initialize this payment." },
      { status: 502 },
    );
  }

  await addPaymentAttempt(reference);

  return NextResponse.json({
    authorizationUrl: payload.data.authorization_url,
    accessCode: payload.data.access_code,
    reference: payload.data.reference ?? reference,
    quote,
  });
}
