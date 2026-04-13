import * as logger from 'firebase-functions/logger';

type LogLevel = 'info' | 'warn' | 'error';

type LogContext = {
  action: string,
  uid?: string | null,
  role?: string | null,
  resourceType?: string | null,
  resourceId?: string | null,
  statusFrom?: string | null,
  statusTo?: string | null,
  outcome?: string | null,
  reasonCode?: string | null,
  documentPresence?: string | null,
  claimsPresence?: string | null,
  bootstrapOutcome?: string | null,
  [key: string]: unknown,
};

export function writeStructuredLog(level: LogLevel, context: LogContext, message: string) {
  if (level === 'warn') {
    logger.warn(message, context);
    return;
  }

  if (level === 'error') {
    logger.error(message, context);
    return;
  }

  logger.info(message, context);
}
