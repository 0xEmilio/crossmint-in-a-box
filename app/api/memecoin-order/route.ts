import { NextRequest, NextResponse } from 'next/server';
import { createOrder, crossmintErrorResponse, TraceSink } from '@/lib/crossmint-server';
import { DEFAULT_CHAIN, SUBSIDIZE_FEES_CONFIG_OVERRIDE_ID } from '@/lib/constants';

// Crossmint's public "xmeme" test token only exists on Solana — this demo stays on
// base-sepolia everywhere else, so memecoin checkout needs its own base-sepolia ERC-20
// test token configured here rather than reusing Crossmint's Solana one.
const XMEME_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_XMEME_TOKEN_ADDRESS;

export async function POST(request: NextRequest) {
  const trace: TraceSink = {};
  try {
    if (!XMEME_TOKEN_ADDRESS) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_XMEME_TOKEN_ADDRESS is not configured' }, { status: 500 });
    }

    const { amount, email, walletAddress, subsidizeFees } = await request.json();

    if (!amount || !email || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const data = await createOrder({
      lineItems: {
        tokenLocator: `${DEFAULT_CHAIN}:${XMEME_TOKEN_ADDRESS}`,
        executionParameters: {
          mode: 'exact-in',
          amount: amount.toString(),
          maxSlippageBps: '500',
          ...(subsidizeFees ? { configOverride: SUBSIDIZE_FEES_CONFIG_OVERRIDE_ID } : {}),
        },
      },
      payment: {
        method: 'card',
        receiptEmail: email,
      },
      recipient: {
        walletAddress,
      },
    }, trace);

    return NextResponse.json({ orderId: data?.order?.orderId, clientSecret: data?.clientSecret, crossmintCall: trace.current });
  } catch (error) {
    return crossmintErrorResponse(error, 'Failed to create memecoin order', trace.current);
  }
}
