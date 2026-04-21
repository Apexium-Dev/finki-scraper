# 🤖 Discord Bot + Scraper Setup

## How It Works:

1. **FINKI Scraper** finds new grades → writes to `data/new_results.json`
2. **Discord Bot** watches this file every 10 seconds
3. **Discord Bot** posts new grades to your Discord server
4. Both can run on same server or different servers

---

## Setup Steps:

### Step 1: Get Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "FINKI Bot"
4. Go to "Bot" section → Click "Add Bot"
5. Copy the TOKEN (click "Copy")
6. Add to your `.env` file:
   ```
   DISCORD_TOKEN=your_bot_token_here
   ```

### Step 2: Get Channel ID

1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click the channel where you want grades posted → "Copy Channel ID"
3. Add to `.env`:
   ```
   DISCORD_CHANNEL_ID=your_channel_id_here
   ```

### Step 3: Invite Bot to Server

1. In Developer Portal, go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`
3. Select permissions: `Send Messages`, `Embed Links`, `Read Message History`
4. Copy the generated URL
5. Open it in browser → Select your server → Authorize

### Step 4: Update `.env` File

Your `.env` should now have:

```
FINKI_INDEKS=your_student_index
FINKI_PASSWORD=your_password
DISCORD_TOKEN=your_bot_token
DISCORD_CHANNEL_ID=your_channel_id
```

### Step 5: Run Both

**Terminal 1 - Start Scraper:**

```bash
npx pm2 start src/index.ts --name "finki-scraper"
```

**Terminal 2 - Start Discord Bot:**

```bash
npx tsx discord-bot.ts
```

Or use PM2 for both:

```bash
npx pm2 start src/index.ts --name "finki-scraper"
npx pm2 start "npx tsx discord-bot.ts" --name "discord-bot"
npx pm2 startup
npx pm2 save
```

---

## How Files Work:

- **Scraper finds grade** → Writes to `data/new_results.json`
- **Discord bot sees new file** → Reads it every 10 seconds
- **Discord bot posts** → Writes to `data/posted_results.json`
- **Clears** `data/new_results.json` after posting

---

## Testing:

Manually add to `data/new_results.json`:

```json
[
  {
    "type": "grade",
    "index": "STUDENT_INDEX",
    "course": "Test Course",
    "points": "99",
    "timestamp": "2026-04-21T12:00:00Z"
  }
]
```

Discord bot should post it within 10 seconds!

---

## Troubleshooting:

**Bot not posting?**

- Check Discord token is correct
- Check channel ID is correct
- Check bot has permissions in channel
- Check `data/new_results.json` exists

**Bot already started?**

- Kill old process: `killall node`
- Or use: `npx pm2 delete all`
