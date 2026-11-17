const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { BatchLogRecordProcessor, LoggerProvider } = require('@opentelemetry/sdk-logs');

const posthogKey = process.env.VITE_POSTHOG_KEY;
const posthogHost = process.env.VITE_POSTHOG_HOST;
let posthogLogger = null;
let loggerProvider = null;

if (posthogKey && posthogHost) {
  loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      'service.name': 'stremio-watchlist',
    }),
    processors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: `${posthogHost.replace(/\/$/, '')}/i/v1/logs`,
          headers: {
            Authorization: `Bearer ${posthogKey}`,
          },
        })
      ),
    ],
  });

  posthogLogger = loggerProvider.getLogger('posthog-integration');
} else if (process.env.NODE_ENV !== 'production') {
  const missingVariable = posthogKey ? 'VITE_POSTHOG_HOST' : 'VITE_POSTHOG_KEY';
  console.warn(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`
  );
}

function logPostHog(severityText, body, attributes) {
  posthogLogger?.emit({ severityText, body, attributes });
}

function flushPostHogLogs(exitCode) {
  if (!loggerProvider) {
    process.exit(exitCode);
    return;
  }

  const forceExit = setTimeout(() => process.exit(exitCode), 3000);
  loggerProvider.shutdown()
    .catch((error) => {
      console.warn('[PostHog Logs] Failed to flush logs during shutdown:', error.message);
    })
    .finally(() => {
      clearTimeout(forceExit);
      process.exit(exitCode);
    });
}

process.once('SIGTERM', () => flushPostHogLogs(143));
process.once('SIGINT', () => flushPostHogLogs(130));

module.exports = { logPostHog };
