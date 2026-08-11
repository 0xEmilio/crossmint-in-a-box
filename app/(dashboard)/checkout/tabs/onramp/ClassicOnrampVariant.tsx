"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CrossmintEmbeddedCheckout, useCrossmintAuth as useAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { buttonStyles, cardStyles, inputStyles, DEFAULT_CHAIN } from "@/lib/constants";
import { useConfigStatus } from "@/app/components/ConfigurationStatus";
import { useAgentWallet } from "@/lib/hooks/useAgentWallet";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import { apiFetch, logCrossmintCall } from "@/lib/client-api";
import { useApiInspector, useSetActiveFlow } from "@/lib/dev-inspector/ApiInspectorContext";
import { useThemeEditor } from "@/lib/checkout-theme-editor/ThemeEditorContext";
import { themeToAppearance, themeToPayment } from "@/lib/checkout-theme-editor/themeReducer";
import { EmbeddedCheckoutFrame } from "../../components/EmbeddedCheckoutFrame";

const SUPPORTED_CHAINS = ["base-sepolia", "solana"];

function ClassicOnrampForm() {
  const { wallet } = useWallet();
  const { user } = useAuth();
  const { log } = useApiInspector();
  useSetActiveFlow("checkout:onramp");
  const { state: themeState } = useThemeEditor();

  const [amount, setAmount] = useState("10");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<{ orderId: string; clientSecret: string } | null>(null);
  const [error, setError] = useState("");
  const [depositSelection, setDepositSelection] = useState<"user" | "agent" | "custom" | null>(null);
  const [customAddress, setCustomAddress] = useState("");

  const { hasAgentWallet, agentWalletAddress } = useAgentWallet(wallet?.address, log);
  const { formatted: agentBalance, loading: agentBalanceLoading } = useTokenBalance(agentWalletAddress || undefined, DEFAULT_CHAIN, "usdc", log);
  const { formatted: userBalance, loading: userBalanceLoading } = useTokenBalance(wallet?.address, DEFAULT_CHAIN, "usdc", log);

  useEffect(() => {
    if (!hasAgentWallet) setDepositSelection(null);
  }, [hasAgentWallet]);

  const canContinue = () => {
    const basicValid = email.trim() !== "" && parseFloat(amount) > 0;
    if (!hasAgentWallet) return basicValid;
    if (depositSelection === null) return false;
    if (depositSelection === "custom") return basicValid && customAddress.trim().length > 0;
    return basicValid;
  };

  const createOrder = async () => {
    if (!wallet?.address) {
      setError("Wallet not connected");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let destinationAddress = wallet.address;
      if (hasAgentWallet) {
        if (depositSelection === "agent") destinationAddress = agentWalletAddress;
        if (depositSelection === "custom" && customAddress.trim()) destinationAddress = customAddress.trim();
      }

      const response = await apiFetch("/api/onramp-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, email, walletAddress: destinationAddress, subsidizeFees: themeState.subsidizeFeesEnabled }),
      }, log);

      const data = await response.json();
      logCrossmintCall(data, log);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create order");
      }

      // Crossmint's embedded checkout handles KYC and payment end-to-end inside its own
      // iframe, so we just hand it the order — no hand-built Persona flow or Checkout.com
      // web-components mounting needed on our side.
      // Future: once we support data sharing, pass along any identity info we already have
      // on file for this user so Crossmint can skip a redundant KYC prompt for repeat buyers.
      setOrder({ orderId: data?.order?.orderId, clientSecret: data?.clientSecret });
    } catch (err) {
      console.error("Order creation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setOrder(null);
    setAmount("10");
    setEmail(user?.email || "");
    setError("");
  };

  if (order?.orderId) {
    const appearance = themeToAppearance(themeState);
    return (
      <div className={cardStyles.base}>
        <h2 className="text-xl font-semibold mb-4 text-center">USDC On-ramp</h2>
        <EmbeddedCheckoutFrame>
          <CrossmintEmbeddedCheckout
            key={order.orderId}
            orderId={order.orderId}
            clientSecret={order.clientSecret}
            payment={themeToPayment(themeState)}
            appearance={appearance}
          />
        </EmbeddedCheckoutFrame>
        <div className="mt-6">
          <button onClick={reset} className={buttonStyles.secondary}>
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cardStyles.base}>
      <h2 className="text-xl font-semibold mb-4 text-center">USDC On-ramp</h2>

      {error && (
        <div className={`${cardStyles.error} mb-4`}>
          <p className="text-red-700 break-words overflow-hidden">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className={inputStyles.base}
            required
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount (USD)
          </label>
          <input
            id="amount"
            type="number"
            min="5"
            max="10000"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10.00"
            className={inputStyles.base}
          />
          <p className="text-sm text-gray-500 mt-1">Minimum: $5, Maximum: $10,000</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {["10", "25", "69", "100"].map((preset) => (
              <button key={preset} type="button" onClick={() => setAmount(preset)} className={buttonStyles.secondary}>
                ${preset}
              </button>
            ))}
          </div>
        </div>

        {hasAgentWallet && (
          <div className="p-4 bg-gray-50 rounded border">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-sm">Deposit to</span>
              <Link href="/agents" className="text-xs text-green-700 underline hover:text-green-800">
                Manage agent wallets →
              </Link>
            </div>
            <div className="space-y-3">
              <label className={`flex items-start justify-between p-3 rounded border ${depositSelection === "user" ? "ring-2 ring-green-500 border-green-400 bg-white dark:bg-gray-900" : "border-gray-200"}`}>
                <span className="flex items-start">
                  <input
                    type="radio"
                    name="deposit-destination"
                    checked={depositSelection === "user"}
                    onChange={() => setDepositSelection("user")}
                    className="mr-3 mt-1"
                  />
                  <span>
                    <div className="text-sm font-medium">My wallet</div>
                    <div className="text-xs text-gray-600 break-all">{wallet?.address}</div>
                    <div className="text-xs text-gray-700 mt-1">Balance: {userBalanceLoading ? "Loading..." : `${userBalance} USDC`}</div>
                  </span>
                </span>
              </label>
              <label className={`flex items-start justify-between p-3 rounded border ${depositSelection === "agent" ? "ring-2 ring-green-500 border-green-400 bg-white dark:bg-gray-900" : "border-gray-200"}`}>
                <span className="flex items-start">
                  <input
                    type="radio"
                    name="deposit-destination"
                    checked={depositSelection === "agent"}
                    onChange={() => setDepositSelection("agent")}
                    className="mr-3 mt-1"
                  />
                  <span>
                    <div className="text-sm font-medium">Agent wallet</div>
                    <div className="text-xs text-gray-600 break-all">{agentWalletAddress}</div>
                    <div className="text-xs text-gray-700 mt-1">Balance: {agentBalanceLoading ? "Loading..." : `${agentBalance} USDC`}</div>
                  </span>
                </span>
              </label>
              <label className={`block p-3 rounded border ${depositSelection === "custom" ? "ring-2 ring-green-500 border-green-400 bg-white dark:bg-gray-900" : "border-gray-200"}`}>
                <div className="flex items-start">
                  <input
                    type="radio"
                    name="deposit-destination"
                    checked={depositSelection === "custom"}
                    onChange={() => setDepositSelection("custom")}
                    className="mr-3 mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Custom address</div>
                    <input
                      type="text"
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      placeholder="0x..."
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                    />
                  </div>
                </div>
              </label>
            </div>
            {depositSelection === null || (depositSelection === "custom" && !customAddress.trim()) ? (
              <div className="mt-2 text-xs text-red-600">Please select a destination{depositSelection === "custom" ? " and enter an address" : ""}</div>
            ) : null}
          </div>
        )}

        <button
          onClick={createOrder}
          disabled={loading || !canContinue()}
          className={canContinue() && !loading ? buttonStyles.primary : buttonStyles.disabled}
        >
          {loading ? "Creating Order..." : "Continue to Checkout"}
        </button>
      </div>
    </div>
  );
}

export function ClassicOnrampVariant() {
  const { configStatus, mounted, loading } = useConfigStatus();
  const isChainSupported = SUPPORTED_CHAINS.includes(DEFAULT_CHAIN);
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
          <p className="text-red-700 mb-2">
            The onramp feature requires a server API key. Please add the following environment variable:
          </p>
          <code className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm block">
            CROSSMINT_SERVER_API_KEY=your-server-api-key
          </code>
          <p className="text-red-600 text-sm mt-2">
            Add this to your <code className="bg-red-100 px-1 rounded">.env.local</code> file and restart the development server.
          </p>
        </div>
      </div>
    );
  }

  if (!isChainSupported) {
    return (
      <div className={cardStyles.base}>
        <h2 className="text-xl font-semibold mb-4 text-center">Buy USDC</h2>
        <div className={cardStyles.error}>
          <p className="text-red-700">
            Onramp is not supported for chain: {DEFAULT_CHAIN}
          </p>
          <p className="text-sm text-red-600 mt-2">
            Supported chains: {SUPPORTED_CHAINS.join(", ")}
          </p>
        </div>
      </div>
    );
  }

  return <ClassicOnrampForm />;
}
