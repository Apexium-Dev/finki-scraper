import { login } from "./auth";
import { scrapeCourses } from "./scraper";

async function main() {
  try {
    const { browser, page } = await login();

    await scrapeCourses(page);

    await browser.close();
  } catch (err) {
    console.error(`${err}`);
  }
}

main();
