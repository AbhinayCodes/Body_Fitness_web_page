type DiagnosticDetails = {
  operation?: string;
  requestId?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  hasBody?: boolean;
  responseType?: string;
  route?: string;
  routeType?: string;
  digest?: string;
  error?: unknown;
};

export function logDiagnostic(level: 'debug' | 'info' | 'warn' | 'error', event: string, details: DiagnosticDetails = {}) {
  if (typeof window !== 'undefined') return;
  if (level === 'debug' && process.env.LOG_LEVEL !== 'debug') return;
  const { error, ...metadata } = details;
  const locations = error instanceof Error ? (error.stack ?? '').split('\n').slice(1)
    .filter((line) => /^\s+at /.test(line))
    .flatMap((line) => line.match(/(?:https?:\/\/|file:\/\/\/|[A-Za-z]:[\\/]|\/)[^()?\n]*\.(?:[cm]?js|tsx?):\d+:\d+(?=\)?$)/)?.[0] ?? [])
    .slice(0, 10) : undefined;
  try {
    console[level](JSON.stringify({ timestamp: new Date().toISOString(), source: 'web-server', level, event, ...metadata, ...(error !== undefined ? { locations: locations ?? [] } : {}) }));
  } catch {}
}