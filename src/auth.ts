import puppeteer from "puppeteer";
import * as dotenv from "dotenv";

dotenv.config();
puppeteer.launch({
  slowMo: 100,
});
export async function login() {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto("https://courses.finki.ukim.mk/login/index.php");

  await page.type("#username", process.env.FINKI_INDEKS!, { delay: 100 });
  await page.type("#password", process.env.FINKI_PASSWORD!, { delay: 100 });
  await page.click(".btn-submit");
  await page.waitForNavigation();
  return { browser, page };
}
login();
