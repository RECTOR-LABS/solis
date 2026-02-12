// Solana USDC mint address
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

interface PaymentAccept {
  scheme: 'exact';
  network: 'solana-mainnet';
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
}

interface PaymentRequiredBody {
  x402Version: 1;
  accepts: PaymentAccept[];
}

export interface PaymentProof {
  x402Version: number;
  scheme: string;
  network: string;
  payload: Record<string, unknown>;
}

export function isX402Enabled(): boolean {
  return process.env.ENABLE_X402 === 'true' && !!process.env.X402_RECEIVER_ADDRESS;
}

export function buildPaymentRequired(resource: string): Response {
  const priceCents = Number(process.env.X402_PRICE_CENTS) || 1;
  // USDC has 6 decimals — 1 cent = 10000 base units
  const amount = String(priceCents * 10_000);

  const body: PaymentRequiredBody = {
    x402Version: 1,
    accepts: [{
      scheme: 'exact',
      network: 'solana-mainnet',
      maxAmountRequired: amount,
      resource,
      description: 'Access SOLIS API',
      payTo: process.env.X402_RECEIVER_ADDRESS!,
      maxTimeoutSeconds: 60,
      asset: USDC_MINT,
    }],
  };

  return new Response(JSON.stringify(body), {
    status: 402,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function parsePaymentProof(header: string): PaymentProof | null {
  try {
    const decoded = atob(header);
    const proof = JSON.parse(decoded) as PaymentProof;
    if (!proof.x402Version || !proof.scheme || !proof.network || !proof.payload) return null;
    return proof;
  } catch {
    return null;
  }
}

export async function verifyPayment(
  paymentHeader: string,
): Promise<{ valid: boolean; error?: string }> {
  const proof = parsePaymentProof(paymentHeader);
  if (!proof) return { valid: false, error: 'Malformed payment proof' };

  const facilitatorUrl = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';

  try {
    const res = await fetch(`${facilitatorUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proof),
    });

    if (!res.ok) {
      return { valid: false, error: `Facilitator returned ${res.status}` };
    }

    const data = (await res.json()) as { valid?: boolean };
    return { valid: !!data.valid };
  } catch (err) {
    return { valid: false, error: `Facilitator unreachable: ${(err as Error).message}` };
  }
}
