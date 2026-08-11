"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CrossmintEmbeddedCheckout,
  useCrossmintAuth as useAuth,
  useCrossmintCheckout,
  useWallet,
} from "@crossmint/client-sdk-react-ui";
import { buttonStyles, cardStyles } from "@/lib/constants";
import { useConfigStatus } from "@/app/components/ConfigurationStatus";
import { useAgentWallet } from "@/lib/hooks/useAgentWallet";
import { useThemeEditor } from "@/lib/checkout-theme-editor/ThemeEditorContext";
import { themeToAppearance, themeToPayment } from "@/lib/checkout-theme-editor/themeReducer";
import { apiFetch, logCrossmintCall } from "@/lib/client-api";
import { useApiInspector, useSetActiveFlow } from "@/lib/dev-inspector/ApiInspectorContext";
import { useCheckoutReady } from "@/lib/hooks/useCheckoutReady";
import { EmbeddedCheckoutFrame } from "../components/EmbeddedCheckoutFrame";
import { Numpad } from "../components/Numpad";

const AMOUNT_PRESETS = ["5", "10", "25", "50"];
const MIN_AMOUNT = 1;

async function createMemecoinOrder(
  amount: string,
  email: string,
  walletAddress: string,
  subsidizeFees: boolean,
  log: ReturnType<typeof useApiInspector>["log"]
): Promise<{ orderId: string; clientSecret: string }> {
  const response = await apiFetch("/api/memecoin-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, email, walletAddress, subsidizeFees }),
  }, log);
  const data = await response.json();
  logCrossmintCall(data, log);
  if (!response.ok) {
    throw new Error(data?.error || "Failed to create order");
  }
  return data;
}

function RecipientPicker({
  walletAddress,
  recipient,
  onSelect,
  log,
}: {
  walletAddress: string;
  recipient: string;
  onSelect: (address: string) => void;
  log: ReturnType<typeof useApiInspector>["log"];
}) {
  const { hasAgentWallet, agentWalletAddress } = useAgentWallet(walletAddress, log);
  const [selection, setSelection] = useState<"my-wallet" | "agent" | "custom">("my-wallet");
  const [customAddress, setCustomAddress] = useState("");

  useEffect(() => {
    if (selection === "my-wallet") onSelect(walletAddress);
  }, [walletAddress, selection, onSelect]);

  return (
    <div className="mb-4 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Receive tokens at</div>
      <div className="space-y-2">
        <label className={`flex items-start gap-2 rounded border p-2 text-sm ${selection === "my-wallet" ? "border-green-400 ring-2 ring-green-500 bg-white dark:bg-gray-900" : "border-gray-200 dark:border-gray-800"}`}>
          <input
            type="radio"
            name="memecoin-recipient"
            className="mt-1"
            checked={selection === "my-wallet"}
            onChange={() => {
              setSelection("my-wallet");
              onSelect(walletAddress);
            }}
          />
          <span>
            <div className="font-medium">My wallet</div>
            <div className="break-all text-xs text-gray-500">{walletAddress}</div>
          </span>
        </label>

        {hasAgentWallet && (
          <label className={`flex items-start gap-2 rounded border p-2 text-sm ${selection === "agent" ? "border-green-400 ring-2 ring-green-500 bg-white dark:bg-gray-900" : "border-gray-200 dark:border-gray-800"}`}>
            <input
              type="radio"
              name="memecoin-recipient"
              className="mt-1"
              checked={selection === "agent"}
              onChange={() => {
                setSelection("agent");
                if (agentWalletAddress) onSelect(agentWalletAddress);
              }}
            />
            <span>
              <div className="font-medium">Agent wallet</div>
              <div className="break-all text-xs text-gray-500">{agentWalletAddress}</div>
            </span>
          </label>
        )}

        <label className={`flex items-start gap-2 rounded border p-2 text-sm ${selection === "custom" ? "border-green-400 ring-2 ring-green-500 bg-white dark:bg-gray-900" : "border-gray-200 dark:border-gray-800"}`}>
          <input
            type="radio"
            name="memecoin-recipient"
            className="mt-1"
            checked={selection === "custom"}
            onChange={() => {
              setSelection("custom");
              onSelect(customAddress);
            }}
          />
          <div className="flex-1">
            <div className="font-medium">Custom address</div>
            <input
              type="text"
              value={customAddress}
              onChange={(e) => {
                setCustomAddress(e.target.value);
                setSelection("custom");
                onSelect(e.target.value);
              }}
              placeholder="0x..."
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
        </label>
      </div>
      {!recipient && <div className="mt-2 text-xs text-red-600">Select or enter a recipient address to continue.</div>}
    </div>
  );
}

function MemecoinCheckoutForm({ walletAddress }: { walletAddress: string }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("1");
  const [debouncedAmount, setDebouncedAmount] = useState("1");
  const [recipient, setRecipient] = useState(walletAddress);
  const { state: themeState } = useThemeEditor();
  const { log } = useApiInspector();
  useSetActiveFlow("checkout:memecoin");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // When the recipient picker is off, always send to the buyer's own wallet — even if it
  // was previously overridden while the picker was on.
  useEffect(() => {
    if (!themeState.recipientPickerEnabled) setRecipient(walletAddress);
  }, [themeState.recipientPickerEnabled, walletAddress]);

  const selectAmount = useCallback((value: string) => {
    setAmount(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed) || parsed < MIN_AMOUNT) return;
    debounceRef.current = setTimeout(() => {
      setDebouncedAmount(value);
    }, 400);
  }, []);

  const { data, error, isFetching } = useQuery({
    queryKey: ["memecoin-order", debouncedAmount, recipient, themeState.subsidizeFeesEnabled],
    queryFn: () =>
      createMemecoinOrder(debouncedAmount, user?.email || "demo@crossmint.com", recipient, themeState.subsidizeFeesEnabled, log),
    enabled: !!recipient,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const appearance = themeToAppearance(themeState);
  const payment = themeToPayment(themeState);
  const checkoutReady = useCheckoutReady(data?.orderId);
  const showSpinner = isFetching || !data?.orderId || !checkoutReady;
  const { order } = useCrossmintCheckout();

  return (
    <div className={cardStyles.base}>
      <h2 className="text-xl font-semibold mb-1 text-center">Memecoin Checkout</h2>
      <p className="text-sm text-gray-500 text-center mb-4">
        Buy a test memecoin on base-sepolia with a card — no seed phrase required. Mirrors Crossmint's
        crossmint-minimal-checkout reference flow.
      </p>

      {themeState.recipientPickerEnabled && (
        <RecipientPicker walletAddress={walletAddress} recipient={recipient} onSelect={setRecipient} log={log} />
      )}

      <div className="flex flex-col items-center gap-4 py-4">
        <span className="text-5xl font-bold tracking-tight">${amount}</span>
        <div className="flex gap-2">
          {AMOUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => selectAmount(preset)}
              className={amount === preset ? buttonStyles.primary : buttonStyles.secondary}
            >
              ${preset}
            </button>
          ))}
        </div>
        <Numpad value={amount} onChange={selectAmount} />
      </div>

      {error && (
        <div className={cardStyles.error}>
          <p className="text-red-700 text-sm">{(error as Error).message}</p>
        </div>
      )}

      {recipient && (
        <>
          <EmbeddedCheckoutFrame>
            <div className="w-full min-h-[60px] relative">
              {showSpinner && (
                <div className="flex items-center justify-center h-[48px] bg-white rounded-md border border-gray-100">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                </div>
              )}
              <div style={{ visibility: showSpinner ? "hidden" : "visible", position: showSpinner ? "absolute" : "relative" }}>
                {data?.orderId && (
                  <CrossmintEmbeddedCheckout
                    key={data.orderId}
                    orderId={data.orderId}
                    clientSecret={data.clientSecret}
                    payment={payment}
                    appearance={appearance}
                  />
                )}
              </div>
            </div>
          </EmbeddedCheckoutFrame>
          {data?.orderId && order?.phase && (
            <p className="mt-2 text-center text-xs text-gray-400">Status: {order.phase}</p>
          )}
        </>
      )}
    </div>
  );
}

export function MemecoinTab() {
  const { wallet } = useWallet();
  const { configStatus, mounted, loading } = useConfigStatus();
  const isServerApiKeyConfigured = mounted ? (configStatus?.serverApiKey ?? false) : false;

  if (!mounted || loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
      </div>
    );
  }

  if (!isServerApiKeyConfigured) {
    return (
      <div className={cardStyles.base}>
        <h2 className="text-xl font-semibold mb-4 text-center text-red-600">Server API Key Not Configured</h2>
        <div className={cardStyles.error}>
          <p className="text-red-700 mb-2">This demo requires a server API key. Please add:</p>
          <code className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm block">
            CROSSMINT_SERVER_API_KEY=your-server-api-key
          </code>
        </div>
      </div>
    );
  }

  if (!wallet?.address) {
    return (
      <div className={cardStyles.error}>
        <p className="text-red-700">Please create or connect a wallet first</p>
      </div>
    );
  }

  return <MemecoinCheckoutForm walletAddress={wallet.address} />;
}
