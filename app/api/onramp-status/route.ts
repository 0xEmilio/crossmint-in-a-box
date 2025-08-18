import { NextRequest, NextResponse } from 'next/server';

const CROSSMINT_ENV = process.env.NEXT_PUBLIC_CROSSMINT_ENV || 'staging';
const CROSSMINT_API_KEY = process.env.CROSSMINT_SERVER_API_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json({ error: 'Crossmint API key not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const response = await fetch(`https://${CROSSMINT_ENV}.crossmint.com/api/2022-06-09/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CROSSMINT_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message || 'Failed to check order status' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Onramp status check failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 