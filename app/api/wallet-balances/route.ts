import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_CHAIN } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.CROSSMINT_SERVER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'CROSSMINT_SERVER_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_CROSSMINT_ENV === 'production' ? 'www' : 'staging';
    const response = await fetch(
      `https://${baseUrl}.crossmint.com/api/2025-06-09/wallets/${walletAddress}/balances?tokens=usdc&chains=${DEFAULT_CHAIN}`,
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch balances: ${response.statusText}`, detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Balance API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
