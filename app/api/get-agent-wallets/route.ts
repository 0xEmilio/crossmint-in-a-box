import { NextRequest, NextResponse } from 'next/server';

const CROSSMINT_ENV = process.env.NEXT_PUBLIC_CROSSMINT_ENV || 'staging';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const serverApiKey = process.env.CROSSMINT_SERVER_API_KEY;
    if (!serverApiKey) {
      return NextResponse.json(
        { error: 'CROSSMINT_SERVER_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Call the Crossmint API to get agent wallets
    const response = await fetch(`https://${CROSSMINT_ENV}.crossmint.com/api/2022-06-09/wallets/userId:agenticwallet-${walletAddress}:evm-smart-wallet`, {
      method: 'GET',
      headers: {
        'X-API-KEY': serverApiKey,
      },
    });

    if (response.status === 404) {
      // No agent wallets found
      return NextResponse.json({
        signers: [],
        message: 'No agent wallets found'
      });
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Crossmint API error:', errorData);
      return NextResponse.json(
        { error: `Failed to get agent wallets: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const walletData = await response.json();
    return NextResponse.json({
      signers: Array.isArray(walletData) ? walletData : [walletData]
    });
  } catch (error) {
    console.error('Error getting agent wallets:', error);
    return NextResponse.json(
      { error: 'Failed to get agent wallets' },
      { status: 500 }
    );
  }
} 