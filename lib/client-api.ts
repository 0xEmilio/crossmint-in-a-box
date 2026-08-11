"use client";

import type { ApiLogEntry } from "./dev-inspector/types";

type LogFn = (entry: Omit<ApiLogEntry, "id" | "timestamp">) => void;

function safeParseBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== "string") return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

interface CrossmintCallShape {
  method: string;
  url: string;
  requestBody: unknown;
  status: number;
  responseBody: unknown;
}

/** If a route response embeds a `crossmintCall` trace (see lib/crossmint-server.ts), log the real
 * outbound request our server made to Crossmint's API as its own Dev Inspector entry. */
export function logCrossmintCall(data: { crossmintCall?: CrossmintCallShape } | null | undefined, log: LogFn) {
  const call = data?.crossmintCall;
  if (!call) return;
  log({
    method: call.method,
    endpoint: call.url,
    requestBody: call.requestBody,
    responseBody: call.responseBody,
    status: call.status,
    durationMs: 0,
  });
}

/** Drop-in replacement for `fetch()` that also records the call for the Dev Inspector panel. */
export async function apiFetch(endpoint: string, init: RequestInit | undefined, log: LogFn): Promise<Response> {
  const start = performance.now();
  let responseBody: unknown = null;
  let status: number | null = null;
  let errorMessage: string | undefined;

  try {
    const response = await fetch(endpoint, init);
    status = response.status;
    responseBody = await response
      .clone()
      .json()
      .catch(() => null);
    return response;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Network error";
    throw err;
  } finally {
    log({
      method: init?.method || "GET",
      endpoint,
      requestBody: safeParseBody(init?.body),
      responseBody,
      status,
      durationMs: Math.round(performance.now() - start),
      error: errorMessage,
    });
  }
}
