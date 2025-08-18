import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const crossmintServerApiKey = process.env.CROSSMINT_SERVER_API_KEY;
    if (!crossmintServerApiKey) {
      return NextResponse.json({ error: 'CROSSMINT_SERVER_API_KEY is not configured' }, { status: 500 });
    }

    const crossmintEnv = process.env.CROSSMINT_ENV || 'staging';
    const baseUrl = crossmintEnv === 'production' ? 'https://www.crossmint.com' : 'https://staging.crossmint.com';

    // Call Crossmint API to get delegated signers for the wallet
    const response = await fetch(`${baseUrl}/api/2022-06-09/wallets/${walletAddress}/signers`, {
      method: 'GET',
      headers: {
        'X-API-KEY': crossmintServerApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No delegated signers found, return empty array
        return NextResponse.json({ signers: [] });
      }
      
      const errorData = await response.json();
      console.error('Crossmint API error:', errorData);
      return NextResponse.json({ 
        error: errorData.message || 'Failed to fetch delegated signers' 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('Delegated signers response:', data);

    return NextResponse.json({ signers: data.signers || [] });

  } catch (error) {
    console.error('Error fetching delegated signers:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch delegated signers' 
    }, { status: 500 });
  }
} 