import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const API_KEY = process.env.CROSSMINT_SERVER_API_KEY;
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Server API key not configured' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_CROSSMINT_ENV === 'production' ? 'www' : 'staging';

    const response = await fetch(`https://${baseUrl}.crossmint.com/api/2022-06-09/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch order status: ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Worldstore status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch order status' },
      { status: 500 }
    );
  }
} 