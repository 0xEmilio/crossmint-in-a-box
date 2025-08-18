import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { walletLocator, signer, chain, expiresAt, permissions } = await request.json();

    if (!walletLocator || !signer || !chain) {
      return NextResponse.json(
        { error: true, message: 'Missing required parameters: walletLocator, signer, chain' },
        { status: 400 }
      );
    }

    const serverApiKey = process.env.CROSSMINT_SERVER_API_KEY;
    if (!serverApiKey) {
      return NextResponse.json(
        { error: true, message: 'Server API key not configured' },
        { status: 500 }
      );
    }

    const crossmintEnv = process.env.NEXT_PUBLIC_CROSSMINT_ENV || 'staging';
    const baseUrl = crossmintEnv === 'production' 
      ? 'https://www.crossmint.com/api' 
      : 'https://staging.crossmint.com/api';

    const response = await fetch(`${baseUrl}/2022-06-09/wallets/${walletLocator}/signers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': serverApiKey,
      },
      body: JSON.stringify({
        signer,
        chain,
        ...(expiresAt && { expiresAt }),
        ...(permissions && { permissions }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: true, message: errorData.message || 'Failed to add delegated signer' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error adding delegated signer:', error);
    return NextResponse.json(
      { error: true, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 