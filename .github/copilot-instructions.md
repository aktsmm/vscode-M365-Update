# Copilot Instructions

このリポジトリは VS Code 拡張機能「M365 UPDATE」のソースコードです。

## プロジェクト概要

- **名前**: M365 UPDATE
- **目的**: Microsoft 365 ロードマップの検索・詳細取得を Copilot Chat から実行
- **言語**: TypeScript
- **フレームワーク**: VS Code Extension API + MCP (Model Context Protocol)

## コーディング規約

- TypeScript の strict モードを使用
- ESM モジュール形式（MCP Server 部分）
- CommonJS 形式（VS Code 拡張機能部分）

## 重要なファイル構造

| ファイル                           | 役割                          |
| ---------------------------------- | ----------------------------- |
| `src/extension.ts`                 | VS Code 拡張機能エントリ      |
| `src/mcp/index.ts`                 | MCP Server エントリ           |
| `src/mcp/server.ts`                | MCP Server 実装               |
| `src/mcp/tools/`                   | MCP ツール（検索、詳細取得）  |
| `src/mcp/database/`                | SQLite データベース           |
| `src/mcp/api/m365RoadmapClient.ts` | M365 Roadmap API クライアント |

## MCP ツール

| ツール                | 説明                  |
| --------------------- | --------------------- |
| `search_m365_roadmap` | M365 ロードマップ検索 |
| `get_m365_update`     | ID 指定で詳細取得     |
| `sync_m365_roadmap`   | API からデータ同期    |

## API ソース

- M365 Roadmap: `https://www.microsoft.com/releasecommunications/api/v2/m365`
- 認証不要（パブリック API）

## Git ブランチ

- メインブランチは `main`
- `git push origin main` を使用すること
