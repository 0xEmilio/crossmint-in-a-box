export interface ApiLogEntry {
  id: string;
  method: string;
  endpoint: string;
  requestBody: unknown;
  responseBody: unknown;
  status: number | null;
  durationMs: number;
  timestamp: number;
  error?: string;
}
