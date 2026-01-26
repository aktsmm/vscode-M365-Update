/**
 * MCP ツール共通型定義
 */

/**
 * MCP ツールのレスポンス
 * MCP SDK の CallToolResult 互換
 */
export interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
  [key: string]: unknown;
}

/**
 * 成功レスポンスを作成
 */
export function createSuccessResponse(data: unknown): ToolResponse {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * エラーレスポンスを作成
 */
export function createErrorResponse(message: string): ToolResponse {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: message }),
      },
    ],
    isError: true,
  };
}
