import { NextRequest, NextResponse } from 'next/server';
import { createOrder, crossmintErrorResponse } from '@/lib/crossmint-server';

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

    const defaultChain = process.env.NEXT_PUBLIC_DEFAULT_CHAIN || 'base-sepolia';

    const data = await createOrder({
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
    });

    return NextResponse.json(data);
  } catch (error) {
    return crossmintErrorResponse(error, 'Failed to create order');
  }
}
