"use client";

import React from "react";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import { buttonStyles, cardStyles, DEFAULT_CHAIN } from "@/lib/constants";
import { formatBalance, getChainDisplayName } from "@/lib/utils";
import { apiFetch } from "@/lib/client-api";
import { useApiInspector, useSetActiveFlow } from "@/lib/dev-inspector/ApiInspectorContext";

interface TokenBalance {
  symbol: string;
  decimals: number;
  chains: Record<string, { rawAmount: string; amount: string }>;
}

function BalanceCard({ activeWallet }: { activeWallet: string }) {
  const [balances, setBalances] = React.useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { log } = useApiInspector();
  useSetActiveFlow("wallets:balance");

  const fetchBalance = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiFetch(`/api/wallet-balances?wallet=${activeWallet}`, undefined, log);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch balances: ${response.statusText}`);
      }

      const data = await response.json();
      setBalances(data);
    } catch (err) {
      console.error("Failed to fetch balances:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch balances");
    } finally {
      setIsLoading(false);
    }
  }, [activeWallet, log]);

  React.useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  if (isLoading) {
    return (
      <div className={cardStyles.base}>
        <h2 className="text-xl font-semibold mb-4 text-center dark:text-gray-100">Fetching Balance...</h2>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cardStyles.base}>
        <h2 className="text-xl font-semibold mb-4 text-center text-red-600">Error</h2>
        <div className={cardStyles.error}>
          <p className="text-red-700 mb-4">{error}</p>
          <button onClick={fetchBalance} className={buttonStyles.primary}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const usdcData = balances.find((b) => b.symbol?.toLowerCase() === "usdc");
  const chainBalance = usdcData?.chains?.[DEFAULT_CHAIN]?.rawAmount || "0";
  const formattedBalance = usdcData ? formatBalance(chainBalance, usdcData.decimals) : "0";
  const hasBalance = parseFloat(chainBalance) > 0;

  return (
    <div className={cardStyles.base}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold dark:text-gray-100">Your Balance</h2>
        <button
          onClick={fetchBalance}
          disabled={isLoading}
          className="p-2 text-gray-500 hover:text-gray-700 disabled:text-gray-300 transition-colors dark:text-gray-400 dark:hover:text-gray-200"
          title="Refresh balance"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center dark:bg-gray-900 dark:border-gray-800">
        <div className="text-3xl font-bold text-green-600 mb-1">{formattedBalance} USDC</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">on {getChainDisplayName(DEFAULT_CHAIN)}</div>
        {!hasBalance && <div className={`${cardStyles.warning} mt-4`}>No USDC found in your wallet</div>}
      </div>
    </div>
  );
}

export function BalanceFetcher() {
  const { wallet } = useWallet();
  const activeWallet = wallet?.address || "";

  if (!activeWallet) {
    return (
      <div className={cardStyles.error}>
        <p className="text-red-700">Please create or connect a wallet first</p>
      </div>
    );
  }

  return <BalanceCard activeWallet={activeWallet} />;
}
