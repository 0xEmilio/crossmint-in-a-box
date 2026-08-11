"use client";

import { CHECKOUT_THEMES, CheckoutThemeId } from "@/lib/checkout-themes";

interface CheckoutThemePickerProps {
  value: CheckoutThemeId;
  onChange: (id: CheckoutThemeId) => void;
}

/** Live theme switcher dropped into embedded-checkout modules to make the `appearance` prop's range visible. */
export function CheckoutThemePicker({ value, onChange }: CheckoutThemePickerProps) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Customize this checkout
      </div>
      <div className="flex gap-2">
        {CHECKOUT_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => onChange(theme.id)}
            title={theme.description}
            className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
              value === theme.id
                ? "border-green-500 bg-green-50 text-green-900 ring-2 ring-green-500 dark:bg-green-500/10 dark:text-green-300"
                : "border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
            }`}
          >
            {theme.label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-400">
        Same order, same integration — only the <code>appearance</code> prop changes.
      </p>
    </div>
  );
}
