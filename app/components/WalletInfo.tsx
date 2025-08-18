"use client";

import React from 'react';
import { useWallet, useAuth } from '@crossmint/client-sdk-react-ui';
import { useAccount } from 'wagmi';
import { cardStyles } from '@/lib/constants';

export function WalletInfo() {
  const { wallet } = useWallet();
  const { user } = useAuth();
  const { address: externalWallet } = useAccount();

  const isWeb3User = !!externalWallet;
  const activeWallet = isWeb3User ? externalWallet : wallet?.address || "";
  const chainLabel = 'base sepolia';

  if (!activeWallet) return null;

  return (
    <div className={cardStyles.base}>
      <h3 className="text-lg font-semibold mb-2">Connected Wallet (base sepolia)</h3>
      <p className="text-sm text-gray-600 break-all">
        Wallet: <strong>{activeWallet}</strong>
      </p>
      {isWeb3User && (
        <p className="text-sm text-green-700 mt-1">Web3 Wallet</p>
      )}
      {!isWeb3User && wallet?.address && (
        <p className="text-green-700 text-sm mt-1">
          Crossmint Smart Wallet
        </p>
      )}
      {user?.email && (
        <p className="text-sm text-green-700 mt-1">
          Auth'd Email: {user.email}
        </p>
      )}
    </div>
  );
} 