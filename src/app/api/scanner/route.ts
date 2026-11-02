import { createPublicKey, verify } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type ScanRequest = { signedPayload?: string; ticketCode?: string; deviceId?: string };

function verifyPayload(signedPayload: string) {
  const separator = signedPayload.lastIndexOf(".");
  if (separator <= 0) return null;
  const payload = signedPayload.slice(0, separator);
  const signature = signedPayload.slice(separator + 1);
  const publicKey = process.env.TICKET_SIGNING_PUBLIC_KEY;
  if (!publicKey || !verify(null, Buffer.from(payload), createPublicKey(publicKey), Buffer.from(signature, "base64url"))) return null;
  try {
    return JSON.parse(payload) as { ticketCode?: string; event?: string };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ result: "invalid", message: "Scanner database is not configured." }, { status: 503 });

  let body: ScanRequest;
  try { body = (await request.json()) as ScanRequest; } catch { return NextResponse.json({ result: "invalid", message: "Invalid scan request." }, { status: 400 }); }

  const signedPayload = body.signedPayload;
  const verified = signedPayload ? verifyPayload(signedPayload) : null;
  const ticketCode = verified?.ticketCode;
  if (!ticketCode || !verified) return NextResponse.json({ result: "invalid", message: "Ticket signature is invalid." }, { status: 422 });

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const ticketResult = await client.query<{ id: string; status: string }>("SELECT id, status FROM tickets WHERE ticket_code = $1 FOR UPDATE", [ticketCode]);
    const ticket = ticketResult.rows[0];
    if (!ticket) {
      await client.query("ROLLBACK");
      return NextResponse.json({ result: "invalid", message: "Ticket not found." }, { status: 404 });
    }

    const result = ticket.status === "used" ? "already_used" : ticket.status === "refunded" ? "refunded" : ticket.status === "void" ? "invalid" : "valid";
    if (result === "valid") await client.query("UPDATE tickets SET status = 'used', used_at = NOW() WHERE id = $1", [ticket.id]);
    await client.query("INSERT INTO ticket_scans (ticket_id, result, device_id) VALUES ($1, $2, $3)", [ticket.id, result, body.deviceId ?? null]);
    await client.query("COMMIT");
    return NextResponse.json({ result, ticketCode, message: result === "valid" ? "Ticket verified. Welcome in." : `Ticket ${result.replace("_", " ")}.` });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
