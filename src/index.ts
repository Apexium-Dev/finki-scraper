import { login } from "./services/auth";
import { scrapeCourses } from "./core/scraper";
import { monitorAnnouncements } from "./core/monitor";

async function runBot() {
  const now = new Date();
  console.log(`Execution started at: ${now.toLocaleString()}`);

  const { browser, page } = await login();

  try {
    console.log("Checking for new courses...");
    await scrapeCourses(page);

    console.log("Checking announcements for new PDF schedules...");
    await monitorAnnouncements(page);

    console.log("Check completed successfully.");
  } catch (error) {
    console.error("Error during execution:", error);
  } finally {
    await browser.close();
    console.log("Browser closed.");
    scheduleNextRun();
  }
}

function scheduleNextRun() {
  const now = new Date();
  const hour = now.getHours();
  let delayHours: number;

  if (hour >= 0 && hour < 7) {
    delayHours = 6;
    console.log(`Night mode active. Next check in ${delayHours} hours.`);
  } else {
    delayHours = 2;
    console.log(`Day mode active. Next check in ${delayHours} hours.`);
  }

  const delayMs = delayHours * 60 * 60 * 1000;

  setTimeout(() => {
    runBot();
  }, delayMs);
}

console.log("Bot process initialized.");
runBot();
