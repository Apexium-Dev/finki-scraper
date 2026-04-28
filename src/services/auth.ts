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
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    timeout: 60000, // Increased from default 30s to 60s
  });
  const page = await browser.newPage();
  await page.goto("https://courses.finki.ukim.mk/login/index.php", {
    waitUntil: "networkidle2",
    timeout: 30000,
  });

  await page.type("#username", process.env.FINKI_INDEKS!);
  await page.type("#password", process.env.FINKI_PASSWORD!);
  await page.click(".btn-submit");
  await page.waitForNavigation({ timeout: 30000 });
  return { browser, page };
}
