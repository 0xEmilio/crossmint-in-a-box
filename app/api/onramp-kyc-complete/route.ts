import { NextRequest, NextResponse } from 'next/server';

const CROSSMINT_ENV = process.env.NEXT_PUBLIC_CROSSMINT_ENV || 'staging';
const CROSSMINT_API_KEY = process.env.CROSSMINT_SERVER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!CROSSMINT_API_KEY) {
      return NextResponse.json({ error: 'Crossmint API key not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { orderId, inquiryId, status } = body;

    if (!orderId || !inquiryId || !status) {
      return NextResponse.json({ error: 'Order ID, inquiry ID, and status are required' }, { status: 400 });
    }

    const getResponse = await fetch(`https://${CROSSMINT_ENV}.crossmint.com/api/2022-06-09/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CROSSMINT_API_KEY,
      },
    });

    if (!getResponse.ok) {
      const errorData = await getResponse.json();
      return NextResponse.json({ error: errorData.message || 'Failed to get order data' }, { status: getResponse.status });
    }

    const currentOrder = await getResponse.json();
    const orderData = currentOrder.order || currentOrder;
    const paymentData = orderData?.payment;

    if (!paymentData) {
      return NextResponse.json({ error: 'No payment data found in order' }, { status: 400 });
    }

    const updatedPayment = {
      ...paymentData,
      kyc: {
        inquiryId: inquiryId,
        status: status,
        completedAt: new Date().toISOString()
      }
    };

    const response = await fetch(`https://${CROSSMINT_ENV}.crossmint.com/api/2022-06-09/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CROSSMINT_API_KEY,
      },
      body: JSON.stringify({
        payment: updatedPayment
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message || 'Failed to update KYC status' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('KYC completion notification failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 