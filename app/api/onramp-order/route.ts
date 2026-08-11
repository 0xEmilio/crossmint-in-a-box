import { NextRequest, NextResponse } from 'next/server';
import { createOrder, crossmintErrorResponse, TraceSink } from '@/lib/crossmint-server';
import { getUsdcTokenLocator } from '@/lib/onramp-token';
import { SUBSIDIZE_FEES_CONFIG_OVERRIDE_ID } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const trace: TraceSink = {};
  try {
    const { amount, email, walletAddress, subsidizeFees } = await request.json();

    if (!amount || !email || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tokenLocator = getUsdcTokenLocator();
    if (!tokenLocator) {
      return NextResponse.json({ error: 'No USDC token configuration for the current chain' }, { status: 500 });
    }

    const data = await createOrder({
      lineItems: [
        {
          tokenLocator,
          executionParameters: {
            mode: 'exact-in',
            amount: amount.toString(),
            ...(subsidizeFees ? { configOverride: SUBSIDIZE_FEES_CONFIG_OVERRIDE_ID } : {}),
          },
        },
      ],
      payment: {
        method: 'card',
        receiptEmail: email,
      },
      recipient: {
        walletAddress: walletAddress,
      },
    }, trace);

    return NextResponse.json({ ...data, crossmintCall: trace.current });
  } catch (error) {
    return crossmintErrorResponse(error, 'Onramp order creation failed', trace.current);
  }
}
