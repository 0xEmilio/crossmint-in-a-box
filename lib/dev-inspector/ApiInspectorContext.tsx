"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { ApiLogEntry } from "./types";

interface ApiInspectorContextValue {
  logEntries: ApiLogEntry[];
  activeFlowId: string | null;
  log: (entry: Omit<ApiLogEntry, "id" | "timestamp">) => void;
  clearLog: () => void;
  setActiveFlow: (flowId: string | null) => void;
}

const ApiInspectorContext = createContext<ApiInspectorContextValue | undefined>(undefined);

let logIdCounter = 0;

export function ApiInspectorProvider({ children }: { children: React.ReactNode }) {
  const [logEntries, setLogEntries] = useState<ApiLogEntry[]>([]);
  const [activeFlowId, setActiveFlowIdState] = useState<string | null>(null);
  const activeFlowRef = useRef<string | null>(null);

  const log = useCallback((entry: Omit<ApiLogEntry, "id" | "timestamp">) => {
    logIdCounter += 1;
    setLogEntries((prev) => [{ ...entry, id: `log-${logIdCounter}`, timestamp: Date.now() }, ...prev].slice(0, 50));
  }, []);

  const clearLog = useCallback(() => setLogEntries([]), []);

  // Switching flows clears the log so stale requests from a previous section don't linger.
  const setActiveFlow = useCallback((flowId: string | null) => {
    if (activeFlowRef.current === flowId) return;
    activeFlowRef.current = flowId;
    setActiveFlowIdState(flowId);
    setLogEntries([]);
  }, []);

  return (
    <ApiInspectorContext.Provider value={{ logEntries, activeFlowId, log, clearLog, setActiveFlow }}>
      {children}
    </ApiInspectorContext.Provider>
  );
}

export function useApiInspector() {
  const ctx = useContext(ApiInspectorContext);
  if (!ctx) throw new Error("useApiInspector must be used within ApiInspectorProvider");
  return ctx;
}

/** Call once per mounted flow/tab so the Dev Inspector knows what's active. */
export function useSetActiveFlow(flowId: string) {
  const { setActiveFlow } = useApiInspector();
  React.useEffect(() => {
    setActiveFlow(flowId);
    return () => setActiveFlow(null);
  }, [flowId, setActiveFlow]);
}
