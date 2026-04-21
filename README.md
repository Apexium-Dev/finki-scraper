# FINKI Scraper Bot

🤖 Automatic Moodle course monitor with PDF grade extraction and Discord notifications.

**Не повеќе рефрешање на Moodle!** The bot automatically checks your courses, extracts grades from PDFs, and posts them to Discord.

## ✨ Features

- ✅ **Automatic Course Monitoring** - Checks 6 summer semester courses every 45 minutes
- ✅ **PDF Grade Extraction** - Parses PDF files to find student grades
- ✅ **Discord Notifications** - Posts grades to Discord with @mentions
- ✅ **24/7 Operation** - Runs on VPS with auto-restart via PM2
- ✅ **Duplicate Prevention** - Tracks posted results to avoid re-posting
- ✅ **Moodle Login** - Secure authentication with Puppeteer browser automation

## 🚀 Quick Start

### Prerequisites

- Node.js v20+
- npm
- Discord bot token
- Discord server with channel

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
# Edit .env with Moodle credentials and Discord token

# 3. Configure student Discord mappings
cp src/config/users.ts.example src/config/users.ts
# Edit with your student indices and Discord IDs

# 4. Run locally
npx tsx src/index.ts          # Terminal 1: Scraper
npx tsx discord-bot.ts         # Terminal 2: Discord bot
```

## 📖 Full Documentation

See [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for:

- Complete architecture overview
- Data flow diagram
- Configuration guide
- Deployment instructions
- Troubleshooting guide
- Development notes

## 🛠️ Environment Setup

Create `.env` file:

```env
FINKI_INDEKS=your_index
FINKI_PASSWORD=your_password
DISCORD_TOKEN=your_bot_token
DISCORD_CHANNEL_ID=channel_id
```

See `.env.example` for more details.

## ⚙️ Configuration

### Student-to-Discord Mapping

Edit `src/config/users.ts`:

```typescript
export const USERS = {
  "232055": { name: "Mahmut", discordId: "1182694996483264656" },
  "231075": { name: "Shenol", discordId: "709432864554614845" },
  // Add more students...
};
```

This file is **gitignored** to protect Discord IDs.

## 📊 How It Works

1. **Login** → Authenticate with Moodle
2. **Discover** → Find 6 enrolled summer courses
3. **Monitor** → Check for new announcements every 45 mins
4. **Extract** → Parse PDFs for grades
5. **Notify** → Post grades to Discord with @mentions
6. **Track** → Record posted grades to avoid duplicates

## 🚀 Deployment

### VPS (24/7 Running)

USER=tvojot_user
PASS=tvojata_lozinka

# Индекси (comma-separated, no spaces)

INDEXI=123456,123123,233333

```

4. `npx tsx src/index.ts`

### Како работи тајмерот?

За да не те блокираат од Moodle дека си бот:

- **Преку ден**: Проверува на секои 2 часа.
- **Навечер (00:00 - 07:00)**: Проверува на секои 6 часа (дека и финки спие).

### Зошто го направив?

Наместо да одиш да инсталираш PDF и да се бараш со CTRL+F само си го отвораш `results.json` и таму ти пишува:
`1234 -> Лаб 138 -> 09:00`.
```
