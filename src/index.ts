import * as dotenv from "dotenv";
import { login } from "./services/auth";
import { scrapeCourses } from "./core/scraper";
import { monitorAnnouncements } from "./core/monitor";

dotenv.config();

async function runBot() {
  const now = new Date();
  const hour = now.getHours();

  // Sleep mode: 4:00 - 7:00 (don't run, save RAM)
  if (hour >= 4 && hour < 7) {
    console.log(`\n[${now.toLocaleString()}] 😴 Sleep mode (4:00-7:00). Skipping run.`);
    scheduleNextRun();
    return;
  }

  console.log(`\n[${now.toLocaleString()}] Execution started...`);

  let browserInstance;

  try {
    const connection = await login();
    browserInstance = connection.browser;
    const page = connection.page;

    console.log("Status: Checking for new courses...");
    await scrapeCourses(page);

    console.log("Status: Monitoring announcement boards for new results...");
    await monitorAnnouncements(page);

    console.log("Status: Check completed successfully.");
  } catch (error) {
    console.error("Critical Error during execution:", error);
  } finally {
    if (browserInstance) {
      await browserInstance.close();
      console.log("Status: Browser instance closed.");
    }

    scheduleNextRun();
  }
}

function scheduleNextRun() {
  const now = new Date();
  const hour = now.getHours();
  let delayMinutes: number;

  // Sleep mode: 4:00-7:00 (no runs, save RAM for cleanup)
  if (hour >= 4 && hour < 7) {
    const wakeupTime = new Date(now);
    wakeupTime.setHours(7, 0, 0, 0);
    const delayMs = wakeupTime.getTime() - now.getTime();
    console.log(
      `😴 Sleep mode active (4:00-7:00). Next run at 7:00 AM (${Math.round(delayMs / 60000)} minutes).`,
    );
    setTimeout(() => {
      console.log("\n🌅 Waking up from sleep! Starting run...");
      runBot();
    }, delayMs);
    return;
  }

  // Normal schedule outside sleep window
  if (hour >= 0 && hour < 4) {
    delayMinutes = 120;
    console.log(
      `Mode: Early morning (0:00-4:00) - Next check scheduled in ${delayMinutes} minutes.`,
    );
  } else {
    delayMinutes = 45;
    console.log(
      `Mode: Active (7:00-23:59) - Next check scheduled in ${delayMinutes} minutes.`,
    );
  }

  const delayMs = delayMinutes * 60 * 1000;

  setTimeout(() => {
    runBot();
  }, delayMs);
}

console.log("System: FINKI Scraper Bot initialized.");
runBot();
