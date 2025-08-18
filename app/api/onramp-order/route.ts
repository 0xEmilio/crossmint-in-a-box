import { NextRequest, NextResponse } from 'next/server';

const CROSSMINT_ENV = process.env.NEXT_PUBLIC_CROSSMINT_ENV || 'staging';
const CROSSMINT_API_KEY = process.env.CROSSMINT_SERVER_API_KEY;
const DEFAULT_CHAIN = process.env.NEXT_PUBLIC_DEFAULT_CHAIN || 'base-sepolia';

const TOKEN_ADDRESSES = {
  'base-sepolia': {
    staging: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    production: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  'solana': {
    staging: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    production: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  }
};

export async function POST(request: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json({ error: 'Crossmint API key not configured' }, { status: 500 });
    }

    const { amount, email, walletAddress } = await request.json();

    if (!amount || !email || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tokenAddresses = TOKEN_ADDRESSES[DEFAULT_CHAIN as keyof typeof TOKEN_ADDRESSES];
    if (!tokenAddresses) {
      return NextResponse.json({ error: `No token configuration for chain: ${DEFAULT_CHAIN}` }, { status: 500 });
    }

    const tokenAddress = tokenAddresses[CROSSMINT_ENV as keyof typeof tokenAddresses];
    const chainPrefix = DEFAULT_CHAIN === 'solana' ? 'solana' : 'base-sepolia';

    const response = await fetch(`https://${CROSSMINT_ENV}.crossmint.com/api/2022-06-09/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CROSSMINT_API_KEY,
      },
      body: JSON.stringify({
        lineItems: [
          {
            tokenLocator: `${chainPrefix}:${tokenAddress}`,
            executionParameters: {
              mode: 'exact-in',
              amount: amount.toString(),
            },
          },
        ],
        payment: {
          method: 'checkoutcom-flow',
          receiptEmail: email,
        },
        recipient: {
          walletAddress: walletAddress,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message || 'Failed to create order' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Onramp order creation failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 