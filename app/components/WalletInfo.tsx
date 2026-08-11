"use client";

import React from 'react';
import { useWallet, useCrossmintAuth as useAuth } from '@crossmint/client-sdk-react-ui';
import { cardStyles } from '@/lib/constants';

export function WalletInfo() {
  const { wallet } = useWallet();
  const { user } = useAuth();

  const activeWallet = wallet?.address || "";

  if (!activeWallet) return null;

  return (
    <div className={cardStyles.base}>
      <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">Connected Wallet (base sepolia)</h3>
      <p className="text-sm text-gray-600 break-all dark:text-gray-400">
        Wallet: <strong>{activeWallet}</strong>
      </p>
      <p className="text-green-700 text-sm mt-1">
        Crossmint Smart Wallet
      </p>
      {user?.email && (
        <p className="text-sm text-green-700 mt-1">
          Auth'd Email: {user.email}
        </p>
      )}
    </div>
  );
}
