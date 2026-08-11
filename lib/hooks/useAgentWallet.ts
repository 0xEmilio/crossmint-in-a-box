"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import type { ApiLogEntry } from "@/lib/dev-inspector/types";

type LogFn = (entry: Omit<ApiLogEntry, "id" | "timestamp">) => void;

interface UseAgentWalletResult {
  hasAgentWallet: boolean;
  agentWalletAddress: string;
  loading: boolean;
  refetch: () => Promise<void>;
}

/** Looks up the delegated agent (smart contract) wallet for a given user wallet via /api/get-agent-wallets.
 * Pass `log` (from useApiInspector) so this call shows up in the Dev Inspector wherever it's used. */
export function useAgentWallet(userWalletAddress: string | undefined, log?: LogFn): UseAgentWalletResult {
  const [hasAgentWallet, setHasAgentWallet] = useState(false);
  const [agentWalletAddress, setAgentWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!userWalletAddress) return;
    setLoading(true);
    try {
      const response = log
        ? await apiFetch("/api/get-agent-wallets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: userWalletAddress }),
          }, log)
        : await fetch("/api/get-agent-wallets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: userWalletAddress }),
          });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to get agent wallets");
      const signers = data.signers || [];
      if (signers.length > 0) {
        setHasAgentWallet(true);
        setAgentWalletAddress(signers[0].address);
      } else {
        setHasAgentWallet(false);
        setAgentWalletAddress("");
      }
    } catch (error) {
      console.error("Failed to fetch agent wallets:", error);
      setHasAgentWallet(false);
      setAgentWalletAddress("");
    } finally {
      setLoading(false);
    }
  }, [userWalletAddress, log]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { hasAgentWallet, agentWalletAddress, loading, refetch };
}
