/**
 * Simple logging utility that wraps console methods
 * Allows centralized control of logging behavior and satisfies eslint no-console rule
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
  enabled?: boolean;
  minLevel?: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private enabled: boolean;
  private minLevel: number;

  constructor(options: LoggerOptions = {}) {
    this.enabled = options.enabled ?? process.env.NODE_ENV !== "test";
    this.minLevel = LOG_LEVELS[options.minLevel ?? "debug"];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enabled && LOG_LEVELS[level] >= this.minLevel;
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const prefix = context ? `[${context}]` : "";
    return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}`.trim();
  }

  debug(message: string, context?: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage("debug", message, context), ...args);
    }
  }

  info(message: string, context?: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      // eslint-disable-next-line no-console
      console.info(this.formatMessage("info", message, context), ...args);
    }
  }

  warn(message: string, context?: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      // eslint-disable-next-line no-console
      console.warn(this.formatMessage("warn", message, context), ...args);
    }
  }

  error(message: string, context?: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      // eslint-disable-next-line no-console
      console.error(this.formatMessage("error", message, context), ...args);
    }
  }
}

// Export singleton instance for general use
export const logger = new Logger();

// Export class for creating scoped loggers
export function createLogger(context: string): {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
} {
  return {
    debug: (message: string, ...args: unknown[]) => logger.debug(message, context, ...args),
    info: (message: string, ...args: unknown[]) => logger.info(message, context, ...args),
    warn: (message: string, ...args: unknown[]) => logger.warn(message, context, ...args),
    error: (message: string, ...args: unknown[]) => logger.error(message, context, ...args),
  };
}
