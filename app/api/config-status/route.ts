import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    clientApiKey: !!process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY,
    serverApiKey: !!process.env.CROSSMINT_SERVER_API_KEY,
    collectionId: !!process.env.NEXT_PUBLIC_CROSSMINT_COLLECTION_ID,
  };

  return NextResponse.json(config);
} 