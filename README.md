# M365 UPDATE MCP

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/yamapan.m365-update?style=flat-square&label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=yamapan.m365-update)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/yamapan.m365-update?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yamapan.m365-update)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg?style=flat-square)](LICENSE)

<p align="center">
  <strong>Search and retrieve Microsoft 365 Roadmap features from Copilot Chat</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=yamapan.m365-update">
    <img src="https://img.shields.io/badge/Install-VS%20Code%20Marketplace-007ACC?style=for-the-badge&logo=visual-studio-code" alt="Install from VS Code Marketplace">
  </a>
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
- ⚙️ **Zero Config**: Automatically registers as MCP tool on installation
- 📄 **Full Results**: Returns ALL matching results with description summary by default
- 🌐 **Reference URLs**: Includes M365 Roadmap and MS Learn links (Japanese preferred)

## 📦 Installation

1. Search for "M365 UPDATE" in VS Code Extension Marketplace
2. Or run: `ext install yamapan.m365-update`
3. Reload VS Code
4. The tool automatically appears in Copilot Chat's tool list! 🎉

## 🎯 Usage

Ask Copilot Chat like this:

```
"What's new in M365?"                    → Last 1 month's updates (default)
"Search for Copilot features"            → Keyword search
"Show me Teams features releasing in 2026" → Date filter
"Get details for ID 548643"              → Full details with MS Learn links
```

### Default Behavior

- **No filters**: Returns last 1 month's updates (15 items)
- **All results include**: `roadmapUrl` to official M365 Roadmap page

## 🛠️ MCP Tools

| Tool                  | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `search_m365_roadmap` | Search with keywords & filters (lightweight metadata) |
| `get_m365_update`     | Get full details by ID with reference URLs            |
| `sync_m365_roadmap`   | Sync data from API                                    |

### Response includes reference URLs

- 🇯🇵 **M365 Roadmap page** (Japanese/English)
- 📚 **MS Learn search** (Japanese/English)

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
