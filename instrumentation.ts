import type { Instrumentation } from 'next';
import { logDiagnostic } from './lib/diagnostics';

export function register() {
  logDiagnostic('info', 'web.started');
}

export const onRequestError: Instrumentation.onRequestError = (error, _request, context) => {
  logDiagnostic('error', 'web.request.failed', { error, route: context.routePath, routeType: context.routeType });
};