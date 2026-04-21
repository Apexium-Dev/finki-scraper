import Discord from "discord.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { USERS } from "./src/config/users";

dotenv.config();

const client = new Discord.Client({
  intents: [Discord.GatewayIntentBits.Guilds],
});

const NEW_RESULTS_FILE = path.join(__dirname, "./data/new_results.json");
const POSTED_FILE = path.join(__dirname, "./data/posted_results.json");
let lastChecked = 0;

client.once(Discord.Events.ClientReady, () => {
  console.log(`✅ Discord bot logged in as ${client.user?.tag}`);
  console.log(`🔍 Watching for new grades in: ${NEW_RESULTS_FILE}`);

  // Check for new results every 10 seconds
  setInterval(checkForNewResults, 10000);
});

async function checkForNewResults() {
  try {
    if (!fs.existsSync(NEW_RESULTS_FILE)) {
      return;
    }

    const fileStats = fs.statSync(NEW_RESULTS_FILE);
    const fileTime = fileStats.mtimeMs;

    // Only check if file was modified since last check
    if (fileTime <= lastChecked) {
      return;
    }

    lastChecked = fileTime;

    const rawData = fs.readFileSync(NEW_RESULTS_FILE, "utf-8");
    const newResults = JSON.parse(rawData || "[]");

    if (newResults.length === 0) {
      return;
    }

    // Get posted results to avoid duplicates
    let postedResults: any[] = [];
    if (fs.existsSync(POSTED_FILE)) {
      postedResults = JSON.parse(fs.readFileSync(POSTED_FILE, "utf-8") || "[]");
    }

    const discordChannelId = process.env.DISCORD_CHANNEL_ID;
    if (!discordChannelId) {
      console.error("❌ DISCORD_CHANNEL_ID not set in .env");
      return;
    }

    const channel = client.channels.cache.get(discordChannelId);
    if (!channel?.isTextBased()) {
      console.error("❌ Channel not found or not a text channel");
      return;
    }

    // Post each new result
    for (const result of newResults) {
      // Check if already posted
      const alreadyPosted = postedResults.some(
        (p) =>
          p.type === result.type &&
          p.index === result.index &&
          p.course === result.course,
      );

      if (!alreadyPosted) {
        // Get user info if available
        const userInfo = USERS[result.index];
        const userMention =
          userInfo && userInfo.discordId
            ? `<@${userInfo.discordId}>`
            : `Index: ${result.index}`;

        // Create embed message
        const embed = new Discord.EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("📊 New Grade Found!")
          .addFields(
            { name: "Student", value: userMention, inline: true },
            { name: "Points", value: result.points, inline: true },
            { name: "Course", value: result.course },
            { name: "Time", value: result.timestamp },
          )
          .setTimestamp();

        await (channel as any).send({ embeds: [embed] });
        console.log(
          `✅ Posted grade: ${result.index} -> ${result.points} (${result.course})`,
        );

        // Mark as posted
        postedResults.push(result);
        fs.writeFileSync(POSTED_FILE, JSON.stringify(postedResults, null, 2));
      }
    }

    // Clear new_results.json after posting
    fs.writeFileSync(NEW_RESULTS_FILE, JSON.stringify([], null, 2));
  } catch (error) {
    console.error("❌ Error checking results:", error);
  }
}

client.login(process.env.DISCORD_TOKEN);
