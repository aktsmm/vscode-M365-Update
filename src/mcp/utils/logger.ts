/**
 * ロガーユーティリティ
 *
 * MCP Server 用のシンプルなロガー（stderr 出力）
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * 現在のログレベル（環境変数で設定可能）
 */
const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * ログ出力
 */
function log(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[LOG_LEVEL]) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data && { data }),
  };

  // MCP Server では stdout は JSON-RPC 通信に使用されるため、stderr に出力
  console.error(JSON.stringify(entry));
}

/**
 * デバッグログ
 */
export function debug(message: string, data?: Record<string, unknown>): void {
  log("debug", message, data);
}

/**
 * 情報ログ
 */
export function info(message: string, data?: Record<string, unknown>): void {
  log("info", message, data);
}

/**
 * 警告ログ
 */
export function warn(message: string, data?: Record<string, unknown>): void {
  log("warn", message, data);
}

/**
 * エラーログ
 */
export function error(message: string, data?: Record<string, unknown>): void {
  log("error", message, data);
}

/**
 * スタックトレース付きエラーログ
 */
export function errorWithStack(
  message: string,
  err: Error,
  data?: Record<string, unknown>,
): void {
  log("error", message, {
    ...data,
    error: err.message,
    stack: err.stack,
  });
}
