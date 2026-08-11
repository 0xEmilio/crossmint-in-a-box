// Canned `appearance` presets for CrossmintEmbeddedCheckout.
// Shared across every embedded-checkout module so the same three looks are
// reachable everywhere, and so "customizability" is something a user can see
// and toggle rather than a one-off prop set once in a single component.

export type CheckoutThemeId = "crossmint" | "midnight" | "minimal";

export interface CheckoutThemeFields {
  destinationInput: boolean;
  receiptEmailInput: boolean;
  globalMessage: boolean;
}

export interface CheckoutThemePayment {
  fiatEnabled: boolean;
  allowedMethods: { card: boolean; applePay: boolean; googlePay: boolean };
  cryptoEnabled: boolean;
  defaultMethod: "fiat" | "crypto";
}

export const DEFAULT_CHECKOUT_FIELDS: CheckoutThemeFields = {
  destinationInput: true,
  receiptEmailInput: true,
  globalMessage: true,
};

export const DEFAULT_CHECKOUT_PAYMENT: CheckoutThemePayment = {
  fiatEnabled: true,
  allowedMethods: { card: true, applePay: true, googlePay: true },
  cryptoEnabled: true,
  defaultMethod: "fiat",
};

export interface CheckoutTheme {
  id: CheckoutThemeId;
  label: string;
  description: string;
  appearance: {
    variables?: Record<string, any>;
    rules?: Record<string, any>;
  };
  /** Falls back to DEFAULT_CHECKOUT_FIELDS/DEFAULT_CHECKOUT_PAYMENT when omitted. */
  fields?: CheckoutThemeFields;
  payment?: CheckoutThemePayment;
}

export const CHECKOUT_THEMES: CheckoutTheme[] = [
  {
    id: "crossmint",
    label: "Crossmint Green",
    description: "The default light theme with Crossmint's signature green accent.",
    appearance: {
      variables: {
        colors: {
          accent: "#16a34a",
          backgroundPrimary: "#ffffff",
          textPrimary: "#111827",
          textSecondary: "#6b7280",
          borderPrimary: "#e5e7eb",
        },
        borderRadius: "10px",
      },
    },
  },
  {
    id: "midnight",
    label: "Midnight Dark",
    description: "A dark, high-contrast theme suited to embedded storefronts.",
    appearance: {
      variables: {
        colors: {
          accent: "#8b5cf6",
          backgroundPrimary: "#0f0f13",
          textPrimary: "#f4f4f5",
          textSecondary: "#a1a1aa",
          borderPrimary: "#27272a",
        },
        borderRadius: "14px",
      },
    },
  },
  {
    id: "minimal",
    label: "Minimal Mono",
    description: "A stripped-down, single-column checkout with no distractions — matches Crossmint's crossmint-minimal-checkout reference (Apple Pay only).",
    appearance: {
      variables: {
        colors: {
          accent: "#000000",
          backgroundPrimary: "#000000",
          textPrimary: "#ffffff",
          textSecondary: "#a1a1aa",
          borderPrimary: "#27272a",
        },
        borderRadius: "6px",
      },
      rules: {
        ReceiptEmailInput: { display: "hidden" },
        DestinationInput: { display: "hidden" },
      },
    },
    fields: {
      destinationInput: false,
      receiptEmailInput: false,
      globalMessage: true,
    },
    payment: {
      fiatEnabled: true,
      allowedMethods: { card: false, applePay: true, googlePay: false },
      cryptoEnabled: false,
      defaultMethod: "fiat",
    },
  },
];

export const DEFAULT_CHECKOUT_THEME_ID: CheckoutThemeId = "crossmint";

export function getCheckoutTheme(id: CheckoutThemeId): CheckoutTheme {
  return CHECKOUT_THEMES.find((theme) => theme.id === id) ?? CHECKOUT_THEMES[0];
}
