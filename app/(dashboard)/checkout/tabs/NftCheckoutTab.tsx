"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet, CrossmintEmbeddedCheckout } from "@crossmint/client-sdk-react-ui";
import { type Hex, parseTransaction } from "viem";
import { cardStyles } from "@/lib/constants";
import { useThemeEditor } from "@/lib/checkout-theme-editor/ThemeEditorContext";
import { themeToAppearance, themeToPayment } from "@/lib/checkout-theme-editor/themeReducer";
import { apiFetch, logCrossmintCall } from "@/lib/client-api";
import { useApiInspector, useSetActiveFlow } from "@/lib/dev-inspector/ApiInspectorContext";
import { EmbeddedCheckoutFrame } from "../components/EmbeddedCheckoutFrame";

async function createPurchaseOrder(walletAddress: string, log: ReturnType<typeof useApiInspector>["log"]): Promise<{ orderId: string; clientSecret: string }> {
  const response = await apiFetch("/api/purchase-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  }, log);
  const data = await response.json();
  logCrossmintCall(data, log);
  if (!response.ok) {
    throw new Error(data?.error || "Failed to create order");
  }
  return data;
}

type CrossmintWallet = NonNullable<ReturnType<typeof useWallet>["wallet"]>;

function PurchaseCheckoutForm({ wallet, activeWallet }: { wallet: CrossmintWallet; activeWallet: string }) {
  const { state: themeState } = useThemeEditor();
  const { log } = useApiInspector();
  useSetActiveFlow("checkout:nft");
  const { data, error, isFetching } = useQuery({
    queryKey: ["purchase-order", activeWallet],
    queryFn: () => createPurchaseOrder(activeWallet, log),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const appearance = themeToAppearance(themeState);
  const basePayment = themeToPayment(themeState, { supportsCrypto: true });
  const payment = basePayment.crypto.enabled
    ? {
        ...basePayment,
        crypto: {
          ...basePayment.crypto,
          payer: {
            address: activeWallet,
            initialChain: "base-sepolia",
            supportedChains: ["base-sepolia", "polygon-amoy"],
            handleChainSwitch: async () => {
              // No-op: the demo wallet stays on its single configured chain.
            },
            handleSignAndSendTransaction: async (serializedTx: string) => {
              try {
                parseTransaction(serializedTx as Hex);
                const { EVMWallet } = await import("@crossmint/client-sdk-react-ui");
                const evmWallet = EVMWallet.from(wallet);
                const transactionResult = await evmWallet.sendTransaction({ transaction: serializedTx } as any);
                return { success: true, txId: transactionResult.hash || "" };
              } catch (error) {
                return {
                  success: false,
                  errorMessage: error instanceof Error ? error.message : "Transaction failed",
                };
              }
            },
          },
        },
      }
    : basePayment;

  if (error) {
    return (
      <div className={cardStyles.error}>
        <p className="text-red-700 text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  if (isFetching || !data?.orderId) {
    return (
      <EmbeddedCheckoutFrame>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Creating order...</p>
          </div>
        </div>
      </EmbeddedCheckoutFrame>
    );
  }

  return (
    <EmbeddedCheckoutFrame>
      <CrossmintEmbeddedCheckout
        key={data.orderId}
        orderId={data.orderId}
        clientSecret={data.clientSecret}
        appearance={appearance}
        payment={payment as any}
      />
    </EmbeddedCheckoutFrame>
  );
}

export function NftCheckoutTab() {
  const { wallet } = useWallet();
  const activeWallet = wallet?.address || "";

  const collectionId = process.env.NEXT_PUBLIC_CROSSMINT_COLLECTION_ID;
  const isCollectionConfigured = !!collectionId;

  if (!isCollectionConfigured) {
    return (
      <div className={cardStyles.base}>
        <h2 className="text-xl font-semibold mb-4 text-center text-red-600">Collection Not Configured</h2>
        <div className={cardStyles.error}>
          <p className="text-red-700 mb-2">
            The NFT collection is not configured. Please add the following environment variable:
          </p>
          <code className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm block">
            NEXT_PUBLIC_CROSSMINT_COLLECTION_ID=your-collection-id
          </code>
          <p className="text-red-600 text-sm mt-2">
            Add this to your <code className="bg-red-100 px-1 rounded">.env.local</code> file and restart the development server.
          </p>
        </div>
      </div>
    );
  }

  if (!activeWallet) {
    return (
      <div className={cardStyles.error}>
        <p className="text-red-700">Please create or connect a wallet first</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Payment Method</h3>
      <div className="min-h-[400px]">
        {wallet ? (
          <PurchaseCheckoutForm wallet={wallet} activeWallet={activeWallet} />
        ) : (
          <EmbeddedCheckoutFrame>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading wallet client...</p>
              </div>
            </div>
          </EmbeddedCheckoutFrame>
        )}
      </div>
    </div>
  );
}
