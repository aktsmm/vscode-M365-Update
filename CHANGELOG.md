# Changelog

All notable changes to the "M365 UPDATE" extension will be documented in this file.

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
