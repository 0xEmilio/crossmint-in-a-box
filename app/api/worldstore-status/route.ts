import { NextRequest, NextResponse } from 'next/server';
import { getOrder, crossmintErrorResponse } from '@/lib/crossmint-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const data = await getOrder(orderId);
    return NextResponse.json(data);
  } catch (error) {
    return crossmintErrorResponse(error, 'Failed to fetch order status');
  }
}
