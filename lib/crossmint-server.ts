// Server-only helpers for calling Crossmint's REST API.
// Centralizes the staging/production base URL and auth header so individual
// API routes don't each re-implement (and occasionally mis-implement) it.
import { NextResponse } from "next/server";

const CROSSMINT_ENV = process.env.NEXT_PUBLIC_CROSSMINT_ENV === "production" ? "production" : "staging";
const CROSSMINT_BASE_URL = CROSSMINT_ENV === "production" ? "https://www.crossmint.com" : "https://staging.crossmint.com";

export class CrossmintApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CrossmintApiError";
    this.status = status;
  }
}

/** A record of one real request/response exchanged with Crossmint's API, for surfacing in the Dev Inspector. */
export interface CrossmintCallTrace {
  method: string;
  url: string;
  requestBody: unknown;
  status: number;
  responseBody: unknown;
}

/** Optional out-param: pass `{}` and read `.current` after the call to get the real Crossmint request/response. */
export type TraceSink = { current?: CrossmintCallTrace };

/** Fetch against the Crossmint REST API using the server API key. Throws CrossmintApiError on non-2xx responses. */
export async function crossmintFetch(path: string, init: RequestInit = {}, trace?: TraceSink): Promise<any> {
  const apiKey = process.env.CROSSMINT_SERVER_API_KEY;
  if (!apiKey) {
    throw new CrossmintApiError("CROSSMINT_SERVER_API_KEY is not configured", 500);
  }

  const url = `${CROSSMINT_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
      ...init.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (trace) {
    trace.current = {
      method: init.method || "GET",
      url,
      requestBody: typeof init.body === "string" ? JSON.parse(init.body) : null,
      status: response.status,
      responseBody: body,
    };
  }

  if (!response.ok) {
    throw new CrossmintApiError(body?.message || body?.error || `Crossmint API error (${response.status})`, response.status);
  }

  return body;
}

export function createOrder(payload: Record<string, unknown>, trace?: TraceSink) {
  return crossmintFetch("/api/2022-06-09/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  }, trace);
}

export function getOrder(orderId: string, trace?: TraceSink) {
  return crossmintFetch(`/api/2022-06-09/orders/${orderId}`, {}, trace);
}

export function updateOrder(orderId: string, payload: Record<string, unknown>, trace?: TraceSink) {
  return crossmintFetch(`/api/2022-06-09/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, trace);
}

/** Converts a caught error from crossmintFetch/createOrder/etc into a NextResponse. */
export function crossmintErrorResponse(error: unknown, fallbackMessage = "Internal server error", crossmintCall?: CrossmintCallTrace) {
  if (error instanceof CrossmintApiError) {
    return NextResponse.json({ error: error.message, crossmintCall }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: fallbackMessage, crossmintCall }, { status: 500 });
}
