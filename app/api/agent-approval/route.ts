import { NextRequest, NextResponse } from 'next/server';

const CROSSMINT_ENV = process.env.NEXT_PUBLIC_CROSSMINT_ENV || 'staging';
const CROSSMINT_API_KEY = process.env.CROSSMINT_SERVER_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json({ error: 'Crossmint API key not configured' }, { status: 500 });
    }

    const { agentWalletAddress, transactionId, signerAddress, signature } = await req.json();
    if (!agentWalletAddress || !transactionId || !signerAddress || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const walletLocator = agentWalletAddress; // raw address
    const url = `https://${CROSSMINT_ENV}.crossmint.com/api/2025-06-09/wallets/${encodeURIComponent(walletLocator)}/transactions/${encodeURIComponent(transactionId)}/approvals`;

    const body = {
      approvals: [
        {
          signer: `external-wallet:${signerAddress}`,
          signature,
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CROSSMINT_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errors = (data && data.errors) || undefined;
      const fallback = 'Failed to approve transaction';
      const message = data?.message
        || (Array.isArray(errors) ? errors.map((e: any) => e?.message || e?.code || String(e)).join('; ') : undefined)
        || (typeof errors === 'string' ? errors : undefined)
        || data?.error
        || fallback;
      return NextResponse.json({ error: message, message, ...(errors ? { errors } : {}) }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('agent-approval error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


