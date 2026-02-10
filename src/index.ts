import { login } from "./auth";
import { scrapeCourses } from "./scraper";
import { monitorAnnouncements } from "./monitor"; // Увези го новиот монитор

async function main() {
  try {
    const { browser, page } = await login();

    await scrapeCourses(page);

    await monitorAnnouncements(page);

    console.log("Done");
    await browser.close();
  } catch (err) {
    console.error(`Error: ${err}`);
  }
}

main();
