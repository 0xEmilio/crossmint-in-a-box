"use client";

import { CheckoutThemePicker } from "@/app/components/CheckoutThemePicker";
import { useThemeEditor } from "@/lib/checkout-theme-editor/ThemeEditorContext";
import { useAppTheme } from "@/lib/theme/AppThemeProvider";
import { Tabs } from "../../components/Tabs";

const MODE_TABS = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

const COLOR_FIELDS: { key: keyof ReturnType<typeof useThemeEditor>["state"]["colors"]; label: string }[] = [
  { key: "accent", label: "Accent" },
  { key: "backgroundPrimary", label: "Background" },
  { key: "textPrimary", label: "Text" },
  { key: "textSecondary", label: "Secondary text" },
  { key: "borderPrimary", label: "Border" },
];

const FIELD_TOGGLES: { key: keyof ReturnType<typeof useThemeEditor>["state"]["fields"]; label: string }[] = [
  { key: "destinationInput", label: "Destination input" },
  { key: "receiptEmailInput", label: "Receipt email input" },
  { key: "globalMessage", label: "Global message" },
];

const METHOD_TOGGLES: { key: keyof ReturnType<typeof useThemeEditor>["state"]["payment"]["allowedMethods"]; label: string }[] = [
  { key: "card", label: "Card" },
  { key: "applePay", label: "Apple Pay" },
  { key: "googlePay", label: "Google Pay" },
];

const DEFAULT_METHOD_TABS = [
  { id: "fiat", label: "Fiat" },
  { id: "crypto", label: "Crypto" },
] as const;

export function CheckoutThemeEditor({ activeFlow }: { activeFlow: "nft" | "onramp" | "memecoin" }) {
  const { state, dispatch } = useThemeEditor();
  const { mode: appMode } = useAppTheme();

  const cryptoSupported = activeFlow === "nft";
  const noPaymentMethodsEnabled =
    !state.payment.fiatEnabled ||
    (!state.payment.allowedMethods.card && !state.payment.allowedMethods.applePay && !state.payment.allowedMethods.googlePay);
  const showNoMethodsWarning = noPaymentMethodsEnabled && !(cryptoSupported && state.payment.cryptoEnabled);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Customize checkout</h3>
        <button
          type="button"
          onClick={() => dispatch({ type: "RESET" })}
          className="text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Reset
        </button>
      </div>

      <div className="mb-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Presets</div>
        <CheckoutThemePicker
          value={state.presetId === "custom" ? "crossmint" : state.presetId}
          onChange={(presetId) => dispatch({ type: "APPLY_PRESET", presetId })}
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Mode</span>
        <Tabs tabs={MODE_TABS} activeId={state.mode} onChange={(mode) => dispatch({ type: "SET_MODE", mode })} />
      </div>

      <div className="mb-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Fields</div>
        <div className="space-y-1">
          {FIELD_TOGGLES.map((field) => (
            <label key={field.key} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.fields[field.key]}
                  onChange={(e) => dispatch({ type: "SET_FIELD_VISIBLE", key: field.key, value: e.target.checked })}
                />
                {field.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Payment methods</div>
        <label className="mb-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={state.payment.fiatEnabled}
            onChange={(e) => dispatch({ type: "SET_FIAT_ENABLED", value: e.target.checked })}
          />
          Fiat enabled
        </label>
        <div className="mb-2 ml-5 space-y-1">
          {METHOD_TOGGLES.map((method) => (
            <label key={method.key} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={state.payment.allowedMethods[method.key]}
                onChange={(e) => dispatch({ type: "SET_ALLOWED_METHOD", key: method.key, value: e.target.checked })}
              />
              {method.label}
            </label>
          ))}
        </div>
        <label
          className={`mb-2 flex items-center gap-2 text-xs ${cryptoSupported ? "text-gray-600 dark:text-gray-400" : "cursor-not-allowed text-gray-400 dark:text-gray-600"}`}
          title={cryptoSupported ? undefined : "Requires a connected wallet payer — only wired for the NFT flow"}
        >
          <input
            type="checkbox"
            disabled={!cryptoSupported}
            checked={state.payment.cryptoEnabled}
            onChange={(e) => dispatch({ type: "SET_CRYPTO_ENABLED", value: e.target.checked })}
          />
          Crypto payments
        </label>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Default method</span>
          <Tabs
            tabs={DEFAULT_METHOD_TABS}
            activeId={state.payment.defaultMethod}
            onChange={(value) => dispatch({ type: "SET_DEFAULT_METHOD", value })}
          />
        </div>
        {showNoMethodsWarning && (
          <p className="mt-2 text-xs text-red-600">No payment methods are enabled — the checkout will have nothing to show.</p>
        )}
      </div>

      {(activeFlow === "memecoin" || activeFlow === "onramp") && (
        <div className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Fees</div>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_SUBSIDIZE_FEES_ENABLED", value: !state.subsidizeFeesEnabled })}
            className={`w-full rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
              state.subsidizeFeesEnabled
                ? "border-green-500 bg-green-50 text-green-900 ring-2 ring-green-500 dark:bg-green-500/10 dark:text-green-300"
                : "border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
            }`}
          >
            {state.subsidizeFeesEnabled ? "Fees subsidized" : "Subsidize fees"}
          </button>
          <p className="mt-1 text-xs text-gray-400">
            Passes a <code>configOverride</code> in <code>lineItems.executionParameters</code> so Crossmint covers the order's fees.
          </p>
        </div>
      )}

      {activeFlow === "memecoin" && (
        <div className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Recipient</div>
          <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={state.recipientPickerEnabled}
              onChange={(e) => dispatch({ type: "SET_RECIPIENT_PICKER_ENABLED", value: e.target.checked })}
            />
            <span>
              Let buyer choose a recipient wallet
              <br />
              <span className="text-gray-400">When off, tokens go to your own wallet and the receipt goes to your account email.</span>
            </span>
          </label>
        </div>
      )}

      <div className="mb-4 space-y-2">
        {COLOR_FIELDS.map((field) => (
          <label key={field.key} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            {field.label}
            <span className="flex items-center gap-2">
              <span className="font-mono text-gray-400">{state.colors[field.key]}</span>
              <input
                type="color"
                value={state.colors[field.key]}
                onChange={(e) => dispatch({ type: "SET_COLOR", key: field.key, value: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border border-gray-200 dark:border-gray-700"
              />
            </span>
          </label>
        ))}
      </div>

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Border radius</span>
          <span className="font-mono text-gray-400">{state.borderRadius}</span>
        </div>
        <input
          type="range"
          min={0}
          max={24}
          value={parseInt(state.borderRadius, 10) || 0}
          onChange={(e) => dispatch({ type: "SET_BORDER_RADIUS", value: `${e.target.value}px` })}
          className="w-full"
        />
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: "SET_MODE", mode: appMode })}
        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900"
      >
        Match app theme ({appMode})
      </button>
    </div>
  );
}
