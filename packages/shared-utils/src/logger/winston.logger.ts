import { createLogger, format, Logger, transports } from 'winston';

const { combine, timestamp, json, colorize, simple, errors } = format;

export interface LoggerOptions {
  service: string;
  level?: string;
}

function buildProductionFormat() {
  return combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    json(),
  );
}

function buildDevelopmentFormat() {
  return combine(
    errors({ stack: true }),
    timestamp({ format: 'HH:mm:ss' }),
    colorize(),
    simple(),
  );
}

export function createAppLogger(options: LoggerOptions): Logger {
  const isProduction = process.env.NODE_ENV === 'production';

  return createLogger({
    level: options.level ?? (isProduction ? 'info' : 'debug'),
    defaultMeta: { service: options.service },
    format: isProduction ? buildProductionFormat() : buildDevelopmentFormat(),
    transports: [
      new transports.Console({
        handleExceptions: true,
        handleRejections: true,
      }),
    ],
    exitOnError: false,
  });
}
