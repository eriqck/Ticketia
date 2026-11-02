import { db } from "@/lib/db";
import type { PaymentQuote } from "@/lib/payments";
import { createPrivateKey, randomUUID, sign } from "node:crypto";
import QRCode from "qrcode";

type CreateOrderInput = {
  reference: string;
  eventId: string;
  eventTitle: string;
  ticketType: string;
  email: string;
  phone: string;
  quote: PaymentQuote;
  quantity: number;
};

export async function createPendingOrder(input: CreateOrderInput) {
  if (!process.env.DATABASE_URL) return;

  await db.query(
    `INSERT INTO orders (
      reference, event_id, event_title, ticket_type, buyer_email, buyer_phone, ticket_amount_kes,
      platform_fee_kes, processing_fee_kes, total_amount_kes, organizer_amount_kes, ticket_quantity
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (reference) DO NOTHING`,
    [
      input.reference,
      input.eventId,
      input.eventTitle,
      input.ticketType,
      input.email,
      input.phone,
      input.quote.ticketAmount,
      input.quote.platformFee,
      input.quote.processingFee,
      input.quote.customerTotal,
      input.quote.organizerAmount,
      input.quantity,
    ],
  );
}

function signTicket(payload: string) {
  const privateKey = process.env.TICKET_SIGNING_PRIVATE_KEY;
  if (!privateKey) throw new Error("TICKET_SIGNING_PRIVATE_KEY is required to issue tickets.");
  return sign(null, Buffer.from(payload), createPrivateKey(privateKey)).toString("base64url");
}

async function issueTickets(client: import("pg").PoolClient, reference: string) {
  const order = await client.query<{
    id: string;
    event_title: string;
    buyer_email: string;
    buyer_phone: string;
    ticket_quantity: number;
  }>(
    `SELECT id, event_title, buyer_email, buyer_phone, ticket_quantity
     FROM orders WHERE reference = $1 FOR UPDATE`,
    [reference],
  );
  const record = order.rows[0];
  if (!record) return;

  for (let index = 0; index < record.ticket_quantity; index += 1) {
    const ticketCode = `TKT-${randomUUID()}`;
    const payload = JSON.stringify({
      ticketCode,
      event: record.event_title,
      buyer: record.buyer_email,
      phone: record.buyer_phone,
      order: reference,
    });
    const signedPayload = `${payload}.${signTicket(payload)}`;
    const qrCodeDataUrl = await QRCode.toDataURL(signedPayload, { errorCorrectionLevel: "M" });
    await client.query(
      `INSERT INTO tickets (order_id, ticket_code, signed_payload, qr_payload, qr_code_data_url)
       VALUES ($1, $2, $3, $3, $4)
       ON CONFLICT (ticket_code) DO NOTHING`,
      [record.id, ticketCode, signedPayload, qrCodeDataUrl],
    );
  }
}

export async function addPaymentAttempt(reference: string) {
  if (!process.env.DATABASE_URL) return;

  await db.query(
    `INSERT INTO payment_attempts (order_id, provider, provider_reference)
     SELECT id, 'paystack', reference FROM orders WHERE reference = $1
     ON CONFLICT (provider_reference) DO NOTHING`,
    [reference],
  );
}

export async function recordPaymentEvent(input: {
  event: string;
  reference: string;
  payload: unknown;
}) {
  if (!process.env.DATABASE_URL) return false;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO payment_events (provider, provider_event, provider_reference, payload)
       VALUES ('paystack', $1, $2, $3)
       ON CONFLICT (provider, provider_reference, provider_event) DO NOTHING
       RETURNING id`,
      [input.event, input.reference, input.payload],
    );

    if (inserted.rowCount === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    if (input.event === "charge.success") {
      await client.query(
        `UPDATE orders SET status = 'paid', paid_at = COALESCE(paid_at, NOW()) WHERE reference = $1`,
        [input.reference],
      );
      await issueTickets(client, input.reference);
      await client.query(
        `UPDATE payment_attempts SET status = 'paid', updated_at = NOW()
         WHERE provider = 'paystack' AND provider_reference = $1`,
        [input.reference],
      );
    }

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
