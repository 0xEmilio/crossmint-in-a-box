import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, page = 1, perPage = 10 } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const serverApiKey = process.env.CROSSMINT_SERVER_API_KEY;
    if (!serverApiKey) {
      return NextResponse.json({ error: 'Server API key not configured' }, { status: 500 });
    }

    const url = `https://staging.crossmint.com/api/2022-06-09/wallets/${walletAddress}/transactions?page=${page}&perPage=${perPage}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': serverApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message || 'Failed to fetch transactions' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
} 