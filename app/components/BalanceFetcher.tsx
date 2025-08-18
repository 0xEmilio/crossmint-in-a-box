"use client";

import React from "react";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import { useAccount } from "wagmi";
import { buttonStyles, cardStyles, DEFAULT_CHAIN } from "@/lib/constants";
import { formatBalance, getChainDisplayName } from "@/lib/utils";

interface TokenBalance {
  token: string;
  decimals: number;
  balances: Record<string, string>;
}

interface BalanceFetcherProps {
  onShowContent: (content: React.ReactNode) => void;
  isActive: boolean;
}

export function BalanceFetcher({ onShowContent, isActive }: BalanceFetcherProps) {
  const { wallet } = useWallet();
  const { address: externalWallet } = useAccount();

  const isWeb3User = !!externalWallet;
  const activeWallet = isWeb3User ? externalWallet : wallet?.address || "";

  const handleFetchBalance = async () => {
    if (!activeWallet) {
      onShowContent(
        <div className={cardStyles.error}>
          <p className="text-red-700">Please create or connect a wallet first</p>
        </div>
      );
      return;
    }
    
    const BalanceDisplay = () => {
      const [balances, setBalances] = React.useState<TokenBalance[]>([]);
      const [isLoading, setIsLoading] = React.useState(true);
      const [error, setError] = React.useState<string | null>(null);

      React.useEffect(() => {
        fetchBalance();
      }, []);

      const fetchBalance = async () => {
        try {
          setIsLoading(true);
          setError(null);

          const response = await fetch(`/api/wallet-balances?wallet=${activeWallet}`);

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
      };

      if (isLoading) {
        return (
          <div className={cardStyles.base}>
            <h2 className="text-xl font-semibold mb-4 text-center">Fetching Balance...</h2>
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
              <button 
                onClick={fetchBalance}
                className={buttonStyles.primary}
              >
                Retry
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className={cardStyles.base}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Balance</h2>
            <button
              onClick={fetchBalance}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:text-gray-300 transition-colors"
              title="Refresh balance"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            {(() => {
              const usdcData = balances.find(b => b.token === 'usdc');
              const chainBalance = usdcData?.balances?.[DEFAULT_CHAIN] || '0';
              const formattedBalance = usdcData ? formatBalance(chainBalance, usdcData.decimals) : '0';
              const hasBalance = parseFloat(chainBalance) > 0;

              return (
                <>
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {formattedBalance} USDC
                  </div>
                  <div className="text-sm text-gray-500">
                    on {getChainDisplayName(DEFAULT_CHAIN)}
                  </div>
                  {!hasBalance && (
                    <div className={`${cardStyles.warning} mt-4`}>
                      No USDC found in your wallet
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      );
    };

    onShowContent(<BalanceDisplay />);
  };

  return (
    <button
      type="button"
      onClick={handleFetchBalance}
      className={isActive ? buttonStyles.primary : buttonStyles.secondary}
    >
      Fetch Balance
    </button>
  );
} 