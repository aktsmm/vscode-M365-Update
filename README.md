# M365 UPDATE

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/yamapan.m365-update?style=flat-square&label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=yamapan.m365-update)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg?style=flat-square)](LICENSE)

<p align="center">
  <strong>Search and retrieve Microsoft 365 Roadmap features from Copilot Chat</strong>
</p>

<p align="center">
  🇯🇵 <a href="README_ja.md">日本語版はこちら</a>
</p>

---

<!-- ![Demo](docs/screenshots/demo.gif) -->

## ✨ Features

- 🔍 **Natural Language Search**: Just ask "What's new in Teams?" in Copilot Chat
- 🚀 **Fast Search**: Local full-text search powered by SQLite + FTS5
- 🔄 **Auto Sync**: Automatically syncs data on first launch and every 24 hours
- 📊 **Rich Filters**: Filter by product, status, and GA date

## 📦 Installation

1. Search for "M365 UPDATE" in VS Code Extension Marketplace
2. Or run: `ext install yamapan.m365-update`

## 🎯 Usage

Ask Copilot Chat like this:

```
"Search for Copilot features in M365 Roadmap"
"Show me Teams features releasing in 2026"
"Get details for ID 548643"
```

## 🛠️ MCP Tools

| Tool                  | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `search_m365_roadmap` | Search with keywords & filters (lightweight metadata) |
| `get_m365_update`     | Get full details by ID                                |
| `sync_m365_roadmap`   | Sync data from API                                    |

### search_m365_roadmap Parameters

| Parameter   | Type     | Description                                              |
| ----------- | -------- | -------------------------------------------------------- |
| `query`     | string   | Search keyword (full-text search on title & description) |
| `products`  | string[] | Filter by products (e.g., `["Microsoft Teams"]`)         |
| `platforms` | string[] | Filter by platforms                                      |
| `status`    | string   | Status (`In development`, `Rolling out`, `Launched`)     |
| `dateFrom`  | string   | GA date range start (`YYYY-MM`)                          |
| `dateTo`    | string   | GA date range end (`YYYY-MM`)                            |
| `limit`     | number   | Max results (1-100, default: 20)                         |

## 📊 Data Source

- [Microsoft 365 Roadmap](https://www.microsoft.com/microsoft-365/roadmap)
- API: `https://www.microsoft.com/releasecommunications/api/v2/m365`
- No authentication required (public API)

## 🔧 Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test with MCP Inspector
npm run inspect
```

## 📝 Tech Stack

- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Database**: SQLite (`better-sqlite3`) + FTS5
- **VS Code API**: Extension integration

## 📄 License

[CC-BY-NC-4.0](LICENSE)

---

© 2026 yamapan (aktsmm)
