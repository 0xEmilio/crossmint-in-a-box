"use client";

import { useAppTheme } from "@/lib/theme/AppThemeProvider";

export function ThemeToggle() {
  const { mode, toggle } = useAppTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle app theme"
      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    >
      <span>{mode === "dark" ? "Dark mode" : "Light mode"}</span>
      <span aria-hidden className="text-base leading-none">
        {mode === "dark" ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
