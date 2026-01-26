# M365 UPDATE MCP

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/yamapan.m365-update?style=flat-square&label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=yamapan.m365-update)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/yamapan.m365-update?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yamapan.m365-update)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg?style=flat-square)](LICENSE)

<p align="center">
  <strong>Microsoft 365 ロードマップを Copilot Chat から検索・取得</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=yamapan.m365-update">
    <img src="https://img.shields.io/badge/インストール-VS%20Code%20Marketplace-007ACC?style=for-the-badge&logo=visual-studio-code" alt="VS Code Marketplace からインストール">
  </a>
</p>

<p align="center">
  🇺🇸 <a href="README.md">English</a>
</p>

---

## ✨ 特徴

- 🔍 **自然言語検索**: Copilot Chat で「Teams の新機能を教えて」と聞くだけ
- 🚀 **高速検索**: SQLite + FTS5 によるローカル全文検索
- 🔄 **自動同期**: 初回起動時・24時間経過後に自動でデータ同期
- 📊 **豊富なフィルタ**: 製品、ステータス、GA日付で絞り込み
- ⚙️ **設定不要**: インストールするだけで MCP ツールとして自動登録

## 📦 インストール

1. VS Code の拡張機能マーケットプレイスから「M365 UPDATE」を検索
2. または: `ext install yamapan.m365-update`
3. VS Code をリロード
4. Copilot Chat のツール一覧に自動表示されます！ 🎉

## 🎯 使い方

Copilot Chat で以下のように話しかけてください：

```
「M365 Roadmap で Copilot 関連の新機能を検索して」
「Teams の2026年リリース予定機能を教えて」
「ID 548643 の詳細を見せて」
```

## 🛠️ MCP ツール

| ツール                | 説明                                         |
| --------------------- | -------------------------------------------- |
| `search_m365_roadmap` | キーワード・フィルタで検索（軽量メタデータ） |
| `get_m365_update`     | ID 指定で詳細取得（参考 URL 付き）          |
| `sync_m365_roadmap`   | API からデータ同期                           |

### レスポンスに参考 URL が含まれます

- 🇯🇵 **M365 Roadmap ページ**（日本語/英語）
- 📚 **MS Learn 検索**（日本語/英語）

```json
{
  "id": 487848,
  "title": "Copilot can now answer questions...",
  "roadmapUrl": "https://www.microsoft.com/ja-jp/microsoft-365/roadmap?...",
  "references": {
    "learnSearchUrl": "https://learn.microsoft.com/ja-jp/search/?terms=..."
  }
}
```

### search_m365_roadmap パラメータ

| パラメータ  | 型       | 説明                                                      |
| ----------- | -------- | --------------------------------------------------------- |
| `query`     | string   | 検索キーワード（タイトル・説明を全文検索）                |
| `products`  | string[] | 製品フィルタ（例: `["Microsoft Teams"]`）                 |
| `platforms` | string[] | プラットフォームフィルタ                                  |
| `status`    | string   | ステータス（`In development`, `Rolling out`, `Launched`） |
| `dateFrom`  | string   | GA 日付範囲（開始）`YYYY-MM`                              |
| `dateTo`    | string   | GA 日付範囲（終了）`YYYY-MM`                              |
| `limit`     | number   | 最大件数（1-100、デフォルト: 20）                         |

## 📊 データソース

- [Microsoft 365 Roadmap](https://www.microsoft.com/microsoft-365/roadmap)
- API: `https://www.microsoft.com/releasecommunications/api/v2/m365`
- 認証不要（パブリック API）

## 🔧 開発

```bash
# 依存関係インストール
npm install

# ビルド
npm run build

# MCP Inspector で確認
npm run inspect
```

## 📝 技術スタック

- **MCP SDK**: `@modelcontextprotocol/sdk`
- **データベース**: SQLite (`better-sqlite3`) + FTS5
- **VS Code API**: 拡張機能統合

## 📄 ライセンス

[CC-BY-NC-4.0](LICENSE)

---

© 2026 yamapan (aktsmm)
