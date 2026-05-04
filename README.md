# 🎭 Inovar Playwright Automation

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.58+-green.svg)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Headless browser automation for scraping teacher schedules from the Inovar school management platform.**

Built with Playwright and TypeScript to automate login, navigation, and HTML snapshot extraction from a proprietary web application. Designed for integration with prof-cli to synchronize class schedules to Outlook Calendar.

## ✨ Features

- 🔐 **Automated login** — Handles authentication flow with credentials
- 📅 **Schedule extraction** — Scrapes current week and next week schedules
- 📸 **HTML snapshots** — Captures full page HTML for downstream parsing
- 🧪 **Browser management** — Reusable BrowserManager service with lifecycle control
- 🛡 **Error handling** — Screenshot capture on failure for debugging
- ⚙️ **Configurable** — Playwright config with headless/headed modes

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/diogooliveira-math/inovar-playwright.git
cd inovar-playwright

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Usage

```bash
# Get current week schedule (outputs HTML to stdout)
npx ts-node getHtmlThisWeekHorario.ts

# Get next week schedule
npx ts-node getHtmlNextWeekHorario.ts

# Run with debug logging
DEBUG=1 npx ts-node main.ts
```

### Environment Setup

Create `.env` file:

```env
INOVAR_USERNAME=your_username
INOVAR_PASSWORD=your_password
INOVAR_BASE_URL=https://your-school.inovar.pt
```

## 📖 Architecture

### Core Components

- **`BrowserManager`** — Singleton service for Playwright lifecycle (launch, navigate, snapshot, close)
- **`BrowserAutomationService`** — High-level API for common automation tasks
- **`getHtmlHorario.ts`** — Generic schedule fetcher with week offset support
- **`getHtmlThisWeekHorario.ts`** / **`getHtmlNextWeekHorario.ts`** — Convenience wrappers

### Workflow

1. Launch headless Chromium browser
2. Navigate to Inovar login page
3. Fill credentials and submit
4. Wait for navigation to dashboard
5. Navigate to schedule page (with week offset)
6. Extract full HTML content
7. Return HTML for downstream parsing (CSV extraction in prof-cli)

### Integration with prof-cli

This automation is called from [`prof-cli`](https://github.com/diogooliveira-math/prof-cli) via subprocess:

```python
# prof-cli/src/prof_cli/integrations/inovar.py
result = subprocess.run(
    ["npx", "ts-node", "getHtmlThisWeekHorario.ts"],
    cwd="/path/to/inovar-playwright",
    capture_output=True
)
html = result.stdout.decode("utf-8")
```

## 🧪 Testing

```bash
# Run Playwright tests
npx playwright test

# View test report
npx playwright show-report
```

Tests cover:
- Browser service lifecycle
- Login flow
- Schedule navigation
- Snapshot schema validation

## 📁 Project Structure

```
inovar-playwright/
├── main.ts                         # Core automation service
├── browser_management.ts           # BrowserManager singleton
├── getHtmlHorario.ts               # Generic schedule fetcher
├── getHtmlThisWeekHorario.ts       # Current week wrapper
├── getHtmlNextWeekHorario.ts       # Next week wrapper
├── agent-browser/                  # Reusable browser agent library
│   └── src/
│       ├── browser.ts              # Playwright wrapper
│       └── snapshot.ts             # Enhanced accessibility snapshot
├── playwright.config.ts            # Playwright configuration
└── logs/screenshots/               # Failure screenshots
```

## 🛠 Technical Stack

- **Language:** TypeScript 5.9+
- **Automation:** Playwright 1.58+
- **Runtime:** Node.js (ts-node for development)
- **Testing:** Playwright Test framework

## ⚠️ Limitations

- Tightly coupled to Inovar platform structure (DOM selectors may break on UI changes)
- Credentials must be provided via environment variables (no interactive prompt)
- No retry logic on transient failures (handled by caller in prof-cli)

## 🎯 Future Improvements

- [ ] Add retry mechanism with exponential backoff
- [ ] Support for multiple schedule views (day, month)
- [ ] Extract more metadata (classroom, teacher notes)
- [ ] Publish as npm package for reuse in other prof-cli integrations

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Context

This project was built to automate schedule synchronization for a Portuguese high school teacher. The Inovar platform lacks an official API, so headless browser automation was necessary.

## 📧 Contact

Diogo F. Oliveira — [diogolll@outlook.pt](mailto:diogolll@outlook.pt)

GitHub: [@diogooliveira-math](https://github.com/diogooliveira-math)
