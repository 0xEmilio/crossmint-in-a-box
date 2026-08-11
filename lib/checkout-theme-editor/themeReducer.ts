import {
  CheckoutThemeFields,
  CheckoutThemeId,
  CheckoutThemePayment,
  DEFAULT_CHECKOUT_FIELDS,
  DEFAULT_CHECKOUT_PAYMENT,
  getCheckoutTheme,
} from "@/lib/checkout-themes";

export type CheckoutMode = "light" | "dark";

export interface CheckoutThemeEditorState {
  mode: CheckoutMode;
  colors: {
    accent: string;
    backgroundPrimary: string;
    textPrimary: string;
    textSecondary: string;
    borderPrimary: string;
  };
  borderRadius: string;
  presetId: CheckoutThemeId | "custom";
  /** Visibility of individual embedded-checkout form fields (`appearance.rules`). */
  fields: CheckoutThemeFields;
  /** Payment-method configuration (`payment.*`), shared across the NFT/Onramp/Memecoin tabs. */
  payment: CheckoutThemePayment;
  /** Memecoin-tab only: whether the buyer can pick a recipient wallet, vs. always using their own. */
  recipientPickerEnabled: boolean;
  /** Onramp/memecoin only: passes a configOverride in lineItems.executionParameters to subsidize fees. */
  subsidizeFeesEnabled: boolean;
}

export type CheckoutThemeEditorAction =
  | { type: "APPLY_PRESET"; presetId: CheckoutThemeId }
  | { type: "SET_COLOR"; key: keyof CheckoutThemeEditorState["colors"]; value: string }
  | { type: "SET_BORDER_RADIUS"; value: string }
  | { type: "SET_MODE"; mode: CheckoutMode }
  | { type: "SET_FIELD_VISIBLE"; key: keyof CheckoutThemeFields; value: boolean }
  | { type: "SET_ALLOWED_METHOD"; key: keyof CheckoutThemePayment["allowedMethods"]; value: boolean }
  | { type: "SET_FIAT_ENABLED"; value: boolean }
  | { type: "SET_CRYPTO_ENABLED"; value: boolean }
  | { type: "SET_DEFAULT_METHOD"; value: CheckoutThemePayment["defaultMethod"] }
  | { type: "SET_RECIPIENT_PICKER_ENABLED"; value: boolean }
  | { type: "SET_SUBSIDIZE_FEES_ENABLED"; value: boolean }
  | { type: "RESET" };

const LIGHT_BASELINE = getCheckoutTheme("crossmint");
const DARK_BASELINE = getCheckoutTheme("midnight");

const PRESET_MODE: Record<CheckoutThemeId, CheckoutMode> = {
  crossmint: "light",
  midnight: "dark",
  minimal: "dark",
};

export const INITIAL_THEME_EDITOR_STATE: CheckoutThemeEditorState = {
  mode: "light",
  colors: { ...LIGHT_BASELINE.appearance.variables!.colors },
  borderRadius: LIGHT_BASELINE.appearance.variables!.borderRadius,
  presetId: "crossmint",
  fields: { ...(LIGHT_BASELINE.fields ?? DEFAULT_CHECKOUT_FIELDS) },
  payment: { ...(LIGHT_BASELINE.payment ?? DEFAULT_CHECKOUT_PAYMENT) },
  recipientPickerEnabled: false,
  subsidizeFeesEnabled: false,
};

export function themeEditorReducer(
  state: CheckoutThemeEditorState,
  action: CheckoutThemeEditorAction
): CheckoutThemeEditorState {
  switch (action.type) {
    case "APPLY_PRESET": {
      const preset = getCheckoutTheme(action.presetId);
      return {
        ...state,
        presetId: action.presetId,
        mode: PRESET_MODE[action.presetId],
        colors: { ...preset.appearance.variables!.colors },
        borderRadius: preset.appearance.variables!.borderRadius,
        fields: { ...(preset.fields ?? DEFAULT_CHECKOUT_FIELDS) },
        payment: { ...(preset.payment ?? DEFAULT_CHECKOUT_PAYMENT) },
      };
    }
    case "SET_COLOR":
      return {
        ...state,
        presetId: "custom",
        colors: { ...state.colors, [action.key]: action.value },
      };
    case "SET_BORDER_RADIUS":
      return { ...state, presetId: "custom", borderRadius: action.value };
    case "SET_MODE": {
      const baseline = action.mode === "dark" ? DARK_BASELINE : LIGHT_BASELINE;
      return {
        ...state,
        mode: action.mode,
        presetId: "custom",
        colors: { ...baseline.appearance.variables!.colors },
        borderRadius: baseline.appearance.variables!.borderRadius,
      };
    }
    case "SET_FIELD_VISIBLE":
      return { ...state, presetId: "custom", fields: { ...state.fields, [action.key]: action.value } };
    case "SET_ALLOWED_METHOD":
      return {
        ...state,
        presetId: "custom",
        payment: { ...state.payment, allowedMethods: { ...state.payment.allowedMethods, [action.key]: action.value } },
      };
    case "SET_FIAT_ENABLED":
      return { ...state, presetId: "custom", payment: { ...state.payment, fiatEnabled: action.value } };
    case "SET_CRYPTO_ENABLED":
      return { ...state, presetId: "custom", payment: { ...state.payment, cryptoEnabled: action.value } };
    case "SET_DEFAULT_METHOD":
      return { ...state, presetId: "custom", payment: { ...state.payment, defaultMethod: action.value } };
    case "SET_RECIPIENT_PICKER_ENABLED":
      return { ...state, recipientPickerEnabled: action.value };
    case "SET_SUBSIDIZE_FEES_ENABLED":
      return { ...state, subsidizeFeesEnabled: action.value };
    case "RESET":
      return INITIAL_THEME_EDITOR_STATE;
    default:
      return state;
  }
}

/** Converts editor state into the exact `appearance` shape CrossmintEmbeddedCheckout expects. */
export function themeToAppearance(state: CheckoutThemeEditorState) {
  const rules: Record<string, { display: "hidden" }> = {};
  if (!state.fields.destinationInput) rules.DestinationInput = { display: "hidden" };
  if (!state.fields.receiptEmailInput) rules.ReceiptEmailInput = { display: "hidden" };
  if (!state.fields.globalMessage) rules.GlobalMessage = { display: "hidden" };

  return {
    variables: {
      colors: { ...state.colors },
      borderRadius: state.borderRadius,
    },
    ...(Object.keys(rules).length > 0 ? { rules } : {}),
  };
}

/** Converts editor state into the `payment` shape CrossmintEmbeddedCheckout expects.
 * `supportsCrypto` should only be passed by flows that actually wire up a `payment.crypto.payer` —
 * otherwise the crypto toggle has no effect and this always resolves crypto to disabled. */
export function themeToPayment(state: CheckoutThemeEditorState, opts?: { supportsCrypto?: boolean }) {
  return {
    fiat: { enabled: state.payment.fiatEnabled, allowedMethods: { ...state.payment.allowedMethods } },
    crypto: { enabled: !!opts?.supportsCrypto && state.payment.cryptoEnabled },
    defaultMethod: state.payment.defaultMethod,
  };
}
