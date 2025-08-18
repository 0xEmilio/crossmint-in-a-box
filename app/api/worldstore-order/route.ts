import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { asin, walletAddress, recipient } = body;

    if (!asin || !walletAddress || !recipient) {
      return NextResponse.json(
        { error: 'ASIN, wallet address, and recipient details are required' },
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
    const defaultChain = process.env.NEXT_PUBLIC_DEFAULT_CHAIN || 'base-sepolia';

    const orderPayload = {
      recipient: {
        email: recipient.email,
        physicalAddress: {
          name: recipient.name,
          line1: recipient.line1,
          line2: recipient.line2 || "",
          city: recipient.city,
          state: recipient.state,
          postalCode: recipient.postalCode,
          country: recipient.country
        }
      },
      locale: "en-US",
      payment: {
        receiptEmail: recipient.email,
        method: defaultChain,
        currency: "usdc",
        payerAddress: walletAddress
      },
      lineItems: [{ productLocator: `amazon:${asin}` }]
    };

    const response = await fetch(`https://${baseUrl}.crossmint.com/api/2022-06-09/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to create order: ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Worldstore order error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    );
  }
} 