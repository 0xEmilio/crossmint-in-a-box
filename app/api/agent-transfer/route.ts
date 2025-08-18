import { NextRequest, NextResponse } from 'next/server';

const CROSSMINT_ENV = process.env.NEXT_PUBLIC_CROSSMINT_ENV || 'staging';
const CROSSMINT_API_KEY = process.env.CROSSMINT_SERVER_API_KEY;
const DEFAULT_CHAIN = process.env.NEXT_PUBLIC_DEFAULT_CHAIN || 'base-sepolia';

export async function POST(req: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json({ error: 'Crossmint API key not configured' }, { status: 500 });
    }

    const { agentWalletAddress, recipient, amount, signerAddress, signerLocator, memo } = await req.json();

    if (!agentWalletAddress || !recipient || !amount || (!signerAddress && !signerLocator)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const walletLocator = agentWalletAddress; // raw address for wallet locator
    const signer = signerLocator || (signerAddress ? `external-wallet:${signerAddress}` : undefined);
    if (!signer) {
      return NextResponse.json({ error: 'Missing signer (provide signerLocator or signerAddress)' }, { status: 400 });
    }

    const url = `https://${CROSSMINT_ENV}.crossmint.com/api/2025-06-09/wallets/${encodeURIComponent(walletLocator)}/tokens/${DEFAULT_CHAIN}:usdc/transfers`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CROSSMINT_API_KEY,
      },
      body: JSON.stringify({
        recipient,
        signer,
        amount: String(amount),
        ...(memo ? { memo } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errors = (data && data.errors) || undefined;
      const fallback = 'Failed to create agent transfer';
      const message = data?.message
        || (Array.isArray(errors) ? errors.map((e: any) => e?.message || e?.code || String(e)).join('; ') : undefined)
        || (typeof errors === 'string' ? errors : undefined)
        || data?.error
        || fallback;
      return NextResponse.json({ error: message, message, ...(errors ? { errors } : {}) }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('agent-transfer error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


