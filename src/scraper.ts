import { Page } from "puppeteer";
import { IGNORED_IDS, getSavedCourses, saveCourses, Course } from "./courses";

export async function scrapeCourses(page: Page) {
  await page.goto("https://courses.finki.ukim.mk/my/courses.php", {
    waitUntil: "networkidle2",
  });

  try {
    await page.waitForSelector(".course-listitem", { timeout: 10000 });

    const coursesLink = await page.$$eval(".course-listitem", (items) => {
      return items
        .map((div) => {
          const link = div.querySelector("a.coursename") as HTMLAnchorElement;
          return {
            id: div.getAttribute("data-course-id") || "",
            name: link?.textContent?.trim().replace(/\s\s+/g, " ") || "Unknown",
            url: link?.href || "",
          };
        })
        .filter((c) => c.id !== "");
    });

    let savedCourses = getSavedCourses();

    for (const course of coursesLink) {
      if (IGNORED_IDS.includes(course.id)) continue;

      const exists = savedCourses.find((c) => c.id === course.id);
      if (exists) continue;

      console.log(`Processing: ${course.name}`);

      try {
        await page.goto(course.url, { waitUntil: "networkidle2" });

        const announcementUrl = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll("a.aalink"));
          const found = anchors.find((a: any) => {
            const innerText = a.innerText || "";
            const instanceName =
              a.querySelector(".instancename")?.textContent || "";
            return /Announcements/i.test(innerText + instanceName);
          });
          return found ? (found as HTMLAnchorElement).href : null;
        });

        if (announcementUrl) {
          savedCourses.push({
            id: course.id,
            name: course.name,
            announcement: announcementUrl,
          });
        }

        await page.goto("https://courses.finki.ukim.mk/my/courses.php", {
          waitUntil: "networkidle2",
        });
        await page.waitForSelector(".course-listitem");
      } catch (err) {
        console.error(`Error in ${course.name}`);
      }
    }

    saveCourses(savedCourses);
    console.log("Sync complete.");
  } catch (err) {
    console.error("Scraper failed:", err);
  }
}
