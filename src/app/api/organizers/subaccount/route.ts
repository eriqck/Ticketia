import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { saveOrganizerPayout } from "@/lib/organizers";

const paystackUrl = "https://api.paystack.co/subaccount";

type SubaccountRequest = {
  settlementBank?: string;
  accountNumber?: string;
  accountName?: string;
  percentageCharge?: number;
};

export async function POST(request: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json({ error: "Paystack is not configured." }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user || user.account_type !== "organizer") {
    return NextResponse.json({ error: "Organizer sign-in required." }, { status: 401 });
  }

  let body: SubaccountRequest;
  try {
    body = (await request.json()) as SubaccountRequest;
  } catch {
    return NextResponse.json({ error: "Invalid organizer payout request." }, { status: 400 });
  }

  const percentageCharge = Number(body.percentageCharge ?? process.env.TICKETIA_PLATFORM_FEE_PERCENT ?? 5);
  if (!body.settlementBank || !body.accountNumber || !body.accountName || percentageCharge < 0 || percentageCharge > 100) {
    return NextResponse.json({ error: "A verified bank account and a valid split are required." }, { status: 400 });
  }

  const response = await fetch(paystackUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      business_name: user.full_name,
      settlement_bank: body.settlementBank,
      account_number: body.accountNumber,
      primary_contact_email: user.email,
      percentage_charge: percentageCharge,
    }),
  });

  const payload = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: { subaccount_code?: string; business_name?: string };
  };

  if (!response.ok || !payload.status || !payload.data?.subaccount_code) {
    return NextResponse.json({ error: payload.message ?? "Paystack could not create the organizer payout account." }, { status: 502 });
  }

  await saveOrganizerPayout({
    businessName: user.full_name,
    email: user.email,
    paystackSubaccountCode: payload.data.subaccount_code,
  });

  return NextResponse.json({
    subaccountCode: payload.data.subaccount_code,
    businessName: payload.data.business_name ?? user.full_name,
    email: user.email,
  });
}
