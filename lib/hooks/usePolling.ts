"use client";

import { useEffect, useRef } from "react";

interface UsePollingOptions {
  enabled: boolean;
  intervalMs?: number;
  maxAttempts?: number;
  onMaxAttemptsReached?: () => void;
}

/**
 * Repeatedly calls `callback` on an interval while `enabled` is true.
 * `callback` returns `true` once polling should stop (terminal state reached).
 */
export function usePolling(callback: () => Promise<boolean | void>, options: UsePollingOptions) {
  const { enabled, intervalMs = 1000, maxAttempts, onMaxAttemptsReached } = options;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    let attempts = 0;
    let stopped = false;
    const interval = setInterval(async () => {
      if (stopped) return;
      attempts++;
      const shouldStop = await callbackRef.current();
      if (shouldStop) {
        stopped = true;
        clearInterval(interval);
      } else if (maxAttempts && attempts >= maxAttempts) {
        stopped = true;
        clearInterval(interval);
        onMaxAttemptsReached?.();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, intervalMs, maxAttempts]);
}
