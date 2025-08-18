import { NextRequest, NextResponse } from 'next/server';

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

    const clientSecret = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY;
    if (!clientSecret) {
      return NextResponse.json(
        { error: 'Client secret not configured' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_CROSSMINT_ENV === 'production' ? 'www' : 'staging';
    const response = await fetch(
      `https://${baseUrl}.crossmint.com/api/v1-alpha2/wallets/${walletAddress}/balances?tokens=usdc`,
      {
        headers: {
          'X-CLIENT-SECRET': clientSecret,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch balances: ${response.statusText}` },
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