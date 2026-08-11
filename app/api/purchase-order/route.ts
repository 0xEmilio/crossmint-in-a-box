import { NextRequest, NextResponse } from 'next/server';
import { createOrder, crossmintErrorResponse, TraceSink } from '@/lib/crossmint-server';

// Server-order counterpart to NftCheckoutTab's crypto payment handlers: the order
// (collection, price, recipient) is created here so the client only ever sees
// an orderId, while payment.crypto's sign/chain-switch callbacks stay client-side
// since they need the connected wallet.
export async function POST(request: NextRequest) {
  const trace: TraceSink = {};
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const collectionId = process.env.NEXT_PUBLIC_CROSSMINT_COLLECTION_ID;
    if (!collectionId) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_CROSSMINT_COLLECTION_ID is not configured' }, { status: 500 });
    }

    const data = await createOrder({
      lineItems: {
        collectionLocator: `crossmint:${collectionId}`,
        callData: {
          totalPrice: '1',
          quantity: 1,
        },
      },
      payment: {
        method: 'card',
      },
      recipient: {
        walletAddress,
      },
    }, trace);

    return NextResponse.json({ orderId: data?.order?.orderId, clientSecret: data?.clientSecret, crossmintCall: trace.current });
  } catch (error) {
    return crossmintErrorResponse(error, 'Failed to create purchase order', trace.current);
  }
}
