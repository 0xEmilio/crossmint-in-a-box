import { NextRequest, NextResponse } from 'next/server';

const CROSSMINT_ENV = process.env.NEXT_PUBLIC_CROSSMINT_ENV || 'staging';

export async function POST(request: NextRequest) {
  try {
    const { adminSignerAddress, userWalletAddress } = await request.json();

    if (!adminSignerAddress) {
      return NextResponse.json(
        { error: 'Admin signer address is required' },
        { status: 400 }
      );
    }

    const serverApiKey = process.env.CROSSMINT_SERVER_API_KEY;
    if (!serverApiKey) {
      return NextResponse.json(
        { error: 'CROSSMINT_SERVER_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`https://${CROSSMINT_ENV}.crossmint.com/api/2022-06-09/wallets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': serverApiKey,
      },
      body: JSON.stringify({
        config: {
          adminSigner: {
            type: 'evm-fireblocks-custodial',
            address: adminSignerAddress,
          },
        },
        linkedUser: `userId:agenticwallet-${adminSignerAddress}`,
        type: 'evm-smart-wallet',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Crossmint API error:', errorData);
      return NextResponse.json(
        { error: `Failed to create agent wallet: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const walletData = await response.json();

    // Add the user's wallet as delegated signer with USDC transfer permission (await before returning)
    if (userWalletAddress && walletData?.address) {
      try {
        const tokenAddressByChain: Record<string, Record<string, string>> = {
          'base-sepolia': {
            staging: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            production: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          },
          'base': {
            staging: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            production: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          },
        };
        const envKey = CROSSMINT_ENV === 'production' ? 'production' : 'staging';
        const defaultChain = process.env.NEXT_PUBLIC_DEFAULT_CHAIN || 'base-sepolia';
        const usdcAddr = (tokenAddressByChain[defaultChain] || tokenAddressByChain['base-sepolia'])[envKey];

        const baseUrl = CROSSMINT_ENV === 'production'
          ? 'https://www.crossmint.com/api'
          : 'https://staging.crossmint.com/api';

        const addSignerRes = await fetch(`${baseUrl}/2022-06-09/wallets/${encodeURIComponent(walletData.address)}/signers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': serverApiKey,
          },
          body: JSON.stringify({
            // Minimal payload: just signer + chain (matches working UI flow)
            signer: userWalletAddress,
            chain: defaultChain,
          }),
        });
        // If adding the signer fails, propagate the error so UI can react
        if (!addSignerRes.ok) {
          const errData = await addSignerRes.json().catch(() => ({}));
          const msg = errData?.message || errData?.error || 'Failed to add delegated signer';
          return NextResponse.json({ error: msg, details: errData }, { status: addSignerRes.status });
        }
      } catch (e) {
        console.error('Failed to add delegated signer on creation', e);
        return NextResponse.json({ error: 'Failed to add delegated signer' }, { status: 500 });
      }
    }

    return NextResponse.json(walletData);
  } catch (error) {
    console.error('Error creating agent wallet:', error);
    return NextResponse.json(
      { error: 'Failed to create agent wallet' },
      { status: 500 }
    );
  }
} 