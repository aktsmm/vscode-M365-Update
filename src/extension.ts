/**
 * VS Code 拡張機能エントリポイント
 *
 * M365 UPDATE 拡張機能のアクティベーション・デアクティベーション
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * MCP 設定ファイルに m365-update サーバーを登録
 */
async function registerMcpServer(
  context: vscode.ExtensionContext,
): Promise<void> {
  console.log("registerMcpServer called");

  // OS に応じた mcp.json パスを決定
  let mcpJsonPath: string;
  if (process.platform === "win32") {
    mcpJsonPath = path.join(
      os.homedir(),
      "AppData",
      "Roaming",
      "Code",
      "User",
      "mcp.json",
    );
  } else if (process.platform === "darwin") {
    mcpJsonPath = path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Code",
      "User",
      "mcp.json",
    );
  } else {
    mcpJsonPath = path.join(
      os.homedir(),
      ".config",
      "Code",
      "User",
      "mcp.json",
    );
  }

  // 拡張機能の MCP サーバーパス（スラッシュに統一）
  const mcpServerPath = path
    .join(context.extensionPath, "dist", "mcp", "index.js")
    .replace(/\\/g, "/");

  try {
    const mcpConfigDir = path.dirname(mcpJsonPath);
    if (!fs.existsSync(mcpConfigDir)) {
      fs.mkdirSync(mcpConfigDir, { recursive: true });
    }

    let mcpConfig: { servers?: Record<string, unknown>; inputs?: unknown[] } = {
      servers: {},
      inputs: [],
    };

    // 既存の mcp.json を読み込み
    if (fs.existsSync(mcpJsonPath)) {
      let content = fs.readFileSync(mcpJsonPath, "utf-8");
      // 末尾カンマを除去（VS Code の mcp.json は末尾カンマを許容するが JSON.parse は許容しない）
      content = content.replace(/,(\s*[}\]])/g, "$1");
      try {
        mcpConfig = JSON.parse(content);
      } catch (parseError) {
        console.error("Failed to parse mcp.json:", parseError);
        // パースエラーの場合は新規作成
        mcpConfig = { servers: {}, inputs: [] };
      }
    }

    // servers がなければ作成
    if (!mcpConfig.servers) {
      mcpConfig.servers = {};
    }

    // m365-update が既に登録されているか確認
    const existingConfig = mcpConfig.servers["m365-update"] as
      | { args?: string[] }
      | undefined;
    const currentPath = existingConfig?.args?.[0];

    // パスが異なる場合（バージョンアップなど）のみ更新
    if (currentPath !== mcpServerPath) {
      console.log("Registering MCP server...");
      console.log("mcp.json path:", mcpJsonPath);
      console.log("MCP server path:", mcpServerPath);

      mcpConfig.servers["m365-update"] = {
        command: "node",
        args: [mcpServerPath],
        type: "stdio",
      };

      fs.writeFileSync(
        mcpJsonPath,
        JSON.stringify(mcpConfig, null, 2),
        "utf-8",
      );

      console.log("MCP server registered successfully");

      if (!currentPath) {
        vscode.window.showInformationMessage(
          "M365 UPDATE: MCP server registered. Please reload VS Code to enable the tool in Copilot Chat.",
        );
      } else {
        vscode.window.showInformationMessage(
          "M365 UPDATE: MCP server path updated. Please reload VS Code.",
        );
      }
    }
  } catch (error) {
    console.error("Failed to register MCP server:", error);
  }
}

/**
 * 拡張機能のアクティベーション
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log("M365 UPDATE MCP extension is now active");
  console.log("Extension path:", context.extensionPath);

  // MCP サーバーを自動登録
  registerMcpServer(context).catch((error) => {
    console.error("Failed to register MCP server:", error);
    vscode.window.showErrorMessage(
      `M365 UPDATE: Failed to register MCP server: ${error.message}`,
    );
  });

  // Sync Roadmap コマンド登録
  const syncCommand = vscode.commands.registerCommand(
    "m365-update.syncRoadmap",
    async () => {
      vscode.window.showInformationMessage("M365 Roadmap sync started...");

      // MCP Server 経由で同期を実行
      // 注意: 実際の同期は MCP Server が担当するため、ここではメッセージのみ
      vscode.window.showInformationMessage(
        "Use Copilot Chat with @m365-update to search and sync M365 Roadmap data.",
      );
    },
  );

  context.subscriptions.push(syncCommand);

  // ステータスバーアイテム
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = "$(calendar) M365";
  statusBarItem.tooltip = "M365 UPDATE - Click to sync roadmap";
  statusBarItem.command = "m365-update.syncRoadmap";
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);
}

/**
 * 拡張機能のデアクティベーション
 */
export function deactivate(): void {
  console.log("M365 UPDATE extension is now deactivated");
}
