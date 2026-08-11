"use client";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

/** Digit-entry pad for typing a dollar amount directly, mirroring crossmint-minimal-checkout's
 * numpad (as an alternative to the preset buttons, not a replacement). */
export function Numpad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const pressKey = (key: string) => {
    if (key === "⌫") {
      onChange(value.slice(0, -1) || "0");
      return;
    }
    if (key === "." && value.includes(".")) return;
    const next = value === "0" && key !== "." ? key : value + key;
    onChange(next);
  };

  return (
    <div className="grid w-full max-w-xs grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => pressKey(key)}
          className="rounded-xl border border-gray-200 py-3 text-xl font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-100 dark:hover:bg-gray-900"
        >
          {key}
        </button>
      ))}
    </div>
  );
}
