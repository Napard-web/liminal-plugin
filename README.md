# Liminal — AI Note Assistant for Obsidian

**Liminal** is an AI-powered assistant for Obsidian that helps you build a richer knowledge base — faster. Using the Anthropic Claude API (Bring Your Own Key), it generates structured notes, suggests relevant tags and links, and can even turn YouTube transcripts into organized notes.

> Desktop only · Requires an [Anthropic API key](https://console.anthropic.com)

---

## Features

| Command | What it does |
|---|---|
| **Generate note from raw text** | Paste any raw text → Claude structures it into a full note with summary, key ideas, tags and links |
| **Suggest tags** | Analyzes the active note and proposes 2–3 relevant tags |
| **Suggest links** | Finds up to 3 semantically related notes in your vault and proposes `[[wikilinks]]` |
| **Process note with instruction** | Run any free-form instruction on the active note (translate, summarize, rewrite…) |
| **Semantic search** | Search your vault by meaning, not just keywords |
| **Generate note from YouTube** | Paste a YouTube URL → retrieves the transcript and generates a structured note |
| **Create folder** | Create a new folder anywhere in your vault |
| **Delete active note** | Delete the current note with a confirmation prompt |
| **Rename active note** | Rename the current note without leaving the editor |
| **Move active note** | Move the current note to another folder in your vault |
| **Duplicate active note** | Create a copy of the current note with a "- copie" suffix |

All commands are accessible from the Command Palette (`Ctrl+P` / `Cmd+P`).

---

## Installation

### From the Community Plugins browser
1. Open **Settings → Community plugins → Browse**
2. Search for **Liminal**
3. Click **Install**, then **Enable**

### Manual installation
1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/Napard-web/liminal-plugin/releases/latest)
2. Create a folder `<your-vault>/.obsidian/plugins/liminal/`
3. Copy both files into that folder
4. Reload Obsidian and enable the plugin in **Settings → Community plugins**

---

## Setup

1. Go to **Settings → Liminal**
2. Paste your Anthropic API key (`sk-ant-...`)
3. Choose a model (Claude Sonnet 4.6 is recommended)

You can get an API key at [console.anthropic.com](https://console.anthropic.com). The plugin uses the API directly from your machine — no data is sent to any third-party server.

---

## How it works

### Note generation
Liminal structures your raw text into a consistent format:
```
# Title
## Summary
## Key Ideas
## Content
## Tags
## Links
```
It also cross-references your existing vault notes to suggest relevant `[[wikilinks]]`.

### Semantic search & link suggestions
The link suggestion feature uses a local keyword-based pre-filter to narrow down candidates before sending the top 15 to Claude — keeping API costs minimal.

### YouTube notes
Liminal fetches the video transcript automatically. If the transcript is blocked, it offers a manual fallback where you can paste the text yourself. Notes from videos include a **Notable quotes** section in addition to the standard structure.

---

## Requirements

- Obsidian **1.4.0** or later
- Desktop (Windows, macOS, Linux) — not available on mobile
- An Anthropic API key

---

## Privacy

- Your API key is stored locally in your vault's plugin data
- Note content is sent to the Anthropic API only when you trigger a command
- No analytics, no telemetry, no external servers beyond Anthropic

---

## License

[MIT](LICENSE) © 2026 Arnaud Delpech
