import { login } from "./services/auth";
import { scrapeCourses } from "./core/scraper";
import { monitorAnnouncements } from "./monitor";

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
