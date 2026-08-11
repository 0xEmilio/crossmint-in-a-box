import { NextRequest, NextResponse } from 'next/server';
import { crossmintFetch, CrossmintApiError, crossmintErrorResponse } from '@/lib/crossmint-server';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Locator grammar is userId:<userId>:<chainType>[:<walletType>] — chainType here is the
    // chain FAMILY ('evm' | 'solana' | ... ), matching the wallet-creation payload's
    // `chainType: 'evm'`, not a specific chain like 'base-sepolia'. walletType is 'smart' | 'mpc',
    // not the legacy 2022-06-09 combined type string 'evm-smart-wallet'.
    const walletData = await crossmintFetch(
      `/api/2025-06-09/wallets/userId:agenticwallet-${walletAddress}:evm:smart`
    );

    return NextResponse.json({
      signers: Array.isArray(walletData) ? walletData : [walletData],
    });
  } catch (error) {
    if (error instanceof CrossmintApiError && error.status === 404) {
      return NextResponse.json({ signers: [], message: 'No agent wallets found' });
    }
    return crossmintErrorResponse(error, 'Failed to get agent wallets');
  }
}
