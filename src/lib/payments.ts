const platformFeePercent = Number(process.env.TICKETIA_PLATFORM_FEE_PERCENT ?? 5);
const processingFeePercent = Number(process.env.PAYSTACK_PROCESSING_FEE_PERCENT ?? 1.5);

export type PaymentQuote = {
  ticketAmount: number;
  platformFee: number;
  processingFee: number;
  customerTotal: number;
  organizerAmount: number;
};

function roundCurrency(amount: number) {
  return Math.round(amount);
}

export function createPaymentQuote(ticketAmount: number): PaymentQuote {
  const platformFee = roundCurrency(ticketAmount * (platformFeePercent / 100));
  const processingFee = roundCurrency(ticketAmount * (processingFeePercent / 100));

  return {
    ticketAmount,
    platformFee,
    processingFee,
    customerTotal: ticketAmount,
    organizerAmount: ticketAmount - platformFee - processingFee,
  };
}

export function getPaystackSplitConfig(ticketAmount: number, subaccountCode: string) {
  const quote = createPaymentQuote(ticketAmount);

  return {
    quote,
    split: {
      subaccount: subaccountCode,
      transaction_charge: quote.platformFee * 100,
      bearer: "account" as const,
    },
  };
}
