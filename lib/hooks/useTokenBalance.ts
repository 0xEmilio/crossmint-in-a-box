"use client";

import { useCallback, useEffect, useState } from "react";
import { formatBalance, parseBalanceToFloat } from "@/lib/utils";
import { apiFetch } from "@/lib/client-api";
import type { ApiLogEntry } from "@/lib/dev-inspector/types";

type LogFn = (entry: Omit<ApiLogEntry, "id" | "timestamp">) => void;

interface UseTokenBalanceResult {
  formatted: string;
  raw: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

/** Fetches and formats a single token's balance for a wallet on a given chain via /api/wallet-balances.
 * Pass `log` (from useApiInspector) so this call shows up in the Dev Inspector wherever it's used. */
export function useTokenBalance(address: string | undefined, chain: string, token: string = "usdc", log?: LogFn): UseTokenBalanceResult {
  const [formatted, setFormatted] = useState("0");
  const [raw, setRaw] = useState(0);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const response = log
        ? await apiFetch(`/api/wallet-balances?wallet=${address}`, undefined, log)
        : await fetch(`/api/wallet-balances?wallet=${address}`);
      if (!response.ok) throw new Error("Failed to fetch balance");
      const data = await response.json();
      const tokenData = data.find((entry: any) => entry.symbol?.toLowerCase() === token.toLowerCase());
      const chainBalance = tokenData?.chains?.[chain]?.rawAmount || "0";
      setFormatted(tokenData ? formatBalance(chainBalance, tokenData.decimals) : "0");
      setRaw(tokenData ? parseBalanceToFloat(chainBalance, tokenData.decimals) : 0);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setFormatted("0");
      setRaw(0);
    } finally {
      setLoading(false);
    }
  }, [address, chain, token, log]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { formatted, raw, loading, refetch };
}
