import * as dotenv from "dotenv";
import { login } from "./services/auth";
import { scrapeCourses } from "./core/scraper";
import { monitorAnnouncements } from "./core/monitor";

dotenv.config();

async function runBot() {
  const now = new Date();
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

  if (hour >= 0 && hour < 7) {
    delayMinutes = 120;
    console.log(
      `Mode: Nightly - Next check scheduled in ${delayMinutes} minutes.`,
    );
  } else {
    delayMinutes = 45;
    console.log(
      `Mode: Active - Next check scheduled in ${delayMinutes} minutes.`,
    );
  }

  const delayMs = delayMinutes * 60 * 1000;

  setTimeout(() => {
    runBot();
  }, delayMs);
}

console.log("System: FINKI Scraper Bot initialized.");
runBot();
