/**
 * VS Code 拡張機能エントリポイント
 *
 * M365 UPDATE 拡張機能のアクティベーション・デアクティベーション
 */

import * as vscode from "vscode";

/**
 * 拡張機能のアクティベーション
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log("M365 UPDATE extension is now active");

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
