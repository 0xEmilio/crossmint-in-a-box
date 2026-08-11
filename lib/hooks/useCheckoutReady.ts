"use client";

import { useEffect, useState } from "react";

/** Tracks whether an embedded checkout iframe has actually rendered its payment UI, via
 * the `ui:express-checkout.ready` / `ui:height.changed` postMessage events Crossmint's
 * hosted checkout page emits (see Crossmint's own crossmint-minimal-checkout reference).
 * Falls back to a short timeout so a missed or late message doesn't leave the UI stuck
 * behind a spinner forever. */
export function useCheckoutReady(orderId: string | undefined) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    if (!orderId) return;

    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (typeof message !== "object" || message == null) return;
      if (message.event === "ui:express-checkout.ready" || message.event === "ui:height.changed") {
        setReady(true);
      }
    };
    window.addEventListener("message", handler);

    const fallback = setTimeout(() => setReady(true), 4000);

    return () => {
      window.removeEventListener("message", handler);
      clearTimeout(fallback);
    };
  }, [orderId]);

  return ready;
}
