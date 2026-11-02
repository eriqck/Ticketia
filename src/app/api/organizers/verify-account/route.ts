import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "Paystack is not configured." }, { status: 503 });
  const params = new URL(request.url).searchParams;
  const accountNumber = params.get("accountNumber");
  const bankCode = params.get("bankCode");
  if (!accountNumber || !bankCode) return NextResponse.json({ error: "Account number and bank are required." }, { status: 400 });

  const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`, { headers: { Authorization: `Bearer ${secretKey}` } });
  const payload = (await response.json()) as { status?: boolean; message?: string; data?: { account_name?: string; account_number?: string } };
  if (!response.ok || !payload.status || !payload.data?.account_name) return NextResponse.json({ error: payload.message ?? "Paystack could not verify this account." }, { status: 422 });
  return NextResponse.json({ accountName: payload.data.account_name, accountNumber: payload.data.account_number });
}
