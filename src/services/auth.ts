import puppeteer from "puppeteer";
import * as dotenv from "dotenv";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      FINKI_INDEKS?: string;
      FINKI_PASSWORD?: string;
      CHROME_PATH?: string;
    }
  }
}

dotenv.config();

export async function login() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || "/usr/bin/chromium-browser",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
  const page = await browser.newPage();
  await page.goto("https://courses.finki.ukim.mk/login/index.php");

  await page.type("#username", process.env.FINKI_INDEKS!);
  await page.type("#password", process.env.FINKI_PASSWORD!);
  await page.click(".btn-submit");
  await page.waitForNavigation();
  return { browser, page };
}
