"use client";

import { useState } from "react";
import { useApiInspector } from "@/lib/dev-inspector/ApiInspectorContext";
import { getCodeSnippet } from "@/lib/code-snippets";
import { Tabs } from "./Tabs";

const PANEL_TABS = [
  { id: "api", label: "API Calls" },
  { id: "code", label: "Code" },
] as const;

type PanelTabId = (typeof PANEL_TABS)[number]["id"];

export function DevInspector() {
  const { activeFlowId, logEntries, clearLog } = useApiInspector();
  const [isOpen, setIsOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTabId>("api");

  if (!activeFlowId) return null;

  const snippet = getCodeSnippet(activeFlowId);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 dark:bg-white dark:text-gray-900"
      >
        <span aria-hidden>{"</>"}</span>
        View Code &amp; API Calls
        {logEntries.length > 0 && (
          <span className="rounded-full bg-green-500 px-1.5 py-0.5 text-xs font-semibold text-white">
            {logEntries.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsOpen(false)} />
          <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-gray-950">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Dev Inspector</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
              <Tabs tabs={PANEL_TABS} activeId={panelTab} onChange={setPanelTab} />
              {panelTab === "api" && logEntries.length > 0 && (
                <button type="button" onClick={clearLog} className="text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400">
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {panelTab === "api" ? <ApiCallsList /> : <CodeView snippet={snippet} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ApiCallsList() {
  const { logEntries } = useApiInspector();

  if (logEntries.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No API calls yet — interact with the flow to see live requests here.</p>;
  }

  return (
    <div className="space-y-3">
      {logEntries.map((entry) => (
        <details key={entry.id} className="rounded-lg border border-gray-200 dark:border-gray-800" open={logEntries[0].id === entry.id}>
          <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs">
            <span className="flex items-center gap-2 font-mono">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {entry.method}
              </span>
              <span className="text-gray-700 dark:text-gray-300">{entry.endpoint}</span>
            </span>
            <span
              className={`rounded px-1.5 py-0.5 font-semibold ${
                entry.error || (entry.status && entry.status >= 400)
                  ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                  : "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
              }`}
            >
              {entry.status ?? "ERR"} · {entry.durationMs}ms
            </span>
          </summary>
          <div className="space-y-2 border-t border-gray-100 p-3 text-xs dark:border-gray-800">
            {entry.requestBody != null && (
              <div>
                <div className="mb-1 font-semibold text-gray-500 dark:text-gray-400">Request</div>
                <pre className="overflow-x-auto rounded bg-gray-50 p-2 dark:bg-gray-900">{JSON.stringify(entry.requestBody, null, 2)}</pre>
              </div>
            )}
            <div>
              <div className="mb-1 font-semibold text-gray-500 dark:text-gray-400">Response</div>
              <pre className="overflow-x-auto rounded bg-gray-50 p-2 dark:bg-gray-900">
                {entry.error ? entry.error : JSON.stringify(entry.responseBody, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

function CodeView({ snippet }: { snippet: ReturnType<typeof getCodeSnippet> }) {
  if (!snippet) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No code sample for this flow yet.</p>;
  }

  return (
    <div className="space-y-4 text-xs">
      <div>
        <div className="mb-1 font-mono text-gray-500 dark:text-gray-400">{snippet.route}</div>
        <pre className="overflow-x-auto rounded bg-gray-50 p-3 dark:bg-gray-900">{snippet.routeCode}</pre>
      </div>
      <div>
        <div className="mb-1 font-semibold text-gray-500 dark:text-gray-400">Client</div>
        <pre className="overflow-x-auto rounded bg-gray-50 p-3 dark:bg-gray-900">{snippet.clientCode}</pre>
      </div>
    </div>
  );
}
