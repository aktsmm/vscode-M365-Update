# Changelog

All notable changes to the "M365 UPDATE MCP" extension will be documented in this file.

## [0.2.4] - 2026-01-26

### Fixed

- 拡張機能のアクティベートエラーを修正（`type: module` を削除）
- mcp.json への自動登録が正常に動作するようになりました

## [0.2.3] - 2026-01-26

### Fixed

- mcp.json の末尾カンマを許容するように修正（自動登録が正常に動作）
- JSON パースエラー時のエラーハンドリングを強化

## [0.2.2] - 2026-01-26

### Changed

- 拡張機能名を「M365 UPDATE MCP」に変更

## [0.2.1] - 2026-01-26

### Fixed

- 拡張機能のアクティベーションイベントを `onStartupFinished` に変更（自動登録が動作するように）
- Windows/macOS/Linux 全ての OS に対応した mcp.json パス処理

## [0.2.0] - 2026-01-26

### Added

- 🎉 **自動 MCP サーバー登録**: 拡張機能インストール時に自動で `mcp.json` に登録
- Copilot Chat のツール一覧に自動表示されるようになりました

## [0.1.2] - 2026-01-26

### Improved

- ツールが日本語で質問された場合は日本語で回答するよう改善
- README のインストール手順を簡略化

## [0.1.1] - 2026-01-26

### Fixed

- MCP Server の依存関係（node_modules）をパッケージに含めるよう修正
- Copilot Chat のツール一覧に表示されない問題を解決

### Added

- README にインストールバッジとボタンを追加

## [0.1.0] - 2026-01-26

### Added

- 🎉 Initial release
- MCP Server integration with VS Code
- `search_m365_roadmap` - M365 ロードマップ検索（キーワード、製品、ステータス、日付範囲）
- `get_m365_update` - ID 指定でフィーチャー詳細取得
- `sync_m365_roadmap` - M365 Roadmap API からデータ同期
- SQLite + FTS5 による高速全文検索
- 自動同期（初回起動時・24時間経過後）

### Data Source

- Microsoft 365 Roadmap API: `https://www.microsoft.com/releasecommunications/api/v2/m365`
