import type { ReactNode } from "react";

/** Consistent rounded chrome around every embedded-checkout instance in the playground.
 * No padding: the rounded `overflow-hidden` clip must sit flush against the iframe's own
 * edges, or the iframe's square corners show through inside the rounded frame. */
export function EmbeddedCheckoutFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-800">
      {children}
    </div>
  );
}
