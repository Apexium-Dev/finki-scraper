import { Page } from "puppeteer";
import { getSavedCourses } from "../services/courses";
import { getLastAnnouncements, saveLastAnnouncements } from "./announcements";
import { parsePdfWithPage, findMultipleIndices } from "../services/pdf-parser";
import { saveGeneralAnnouncement } from "../services/results";

export async function monitorAnnouncements(page: Page) {
  const courses = getSavedCourses();
  const state = getLastAnnouncements();
  const indicesToSearch = (process.env.INDEXI || "")
    .split(",")
    .map((i) => i.trim());
  let hasUpdates = false;

  for (const course of courses) {
    if (!course.announcement) continue;

    try {
      await page.goto(course.announcement, { waitUntil: "networkidle2" });

      const latest = await page.evaluate(() => {
        const row = document.querySelector("tr.discussion");
        if (!row) return null;
        const linkElement = row.querySelector(".topic a") as HTMLAnchorElement;
        return {
          id: new URL(linkElement.href).searchParams.get("d") || "",
          title: linkElement.innerText.trim(),
          link: linkElement.href,
        };
      });

      if (!latest) continue;

      const previous = state[course.id];

      if (!previous || previous.id !== latest.id) {
        console.log(`New announcement: [${course.name}] ${latest.title}`);
        await page.goto(latest.link, { waitUntil: "networkidle2" });

        const postData = await page.evaluate(() => {
          const contentElement = document.querySelector(
            ".post-content-container",
          );
          const pdfLink = document.querySelector(
            'a[href*=".pdf"]',
          ) as HTMLAnchorElement;

          return {
            text: contentElement
              ? (contentElement as HTMLElement).innerText.trim()
              : "",
            pdfUrl: pdfLink ? pdfLink.href : null,
          };
        });

        saveGeneralAnnouncement({
          course: course.name,
          title: latest.title,
          content: postData.text,
          link: latest.link,
        });

        state[course.id] = {
          id: latest.id,
          title: latest.title,
          link: latest.link,
          date_checked: new Date().toLocaleString(),
        };
        hasUpdates = true;

        const isSchedule =
          /распоред|полагање|испит|колоквиум|raspored|polaganje/i.test(
            latest.title,
          );

        if (isSchedule && postData.pdfUrl) {
          console.log(`Schedule detected! Parsing PDF: ${postData.pdfUrl}`);
          const pdfText = await parsePdfWithPage(page, postData.pdfUrl);

          const results = findMultipleIndices(pdfText, indicesToSearch);

          const foundOnes = results.filter(
            (r) => r.found && r.room !== "Не е најдена",
          );

          if (foundOnes.length > 0) {
            console.log(`Found ${foundOnes.length} matches in the PDF!`);
          }
        }
      }
    } catch (err: any) {
      console.error(`Failed to check course ${course.id}:`, err.message || err);
    }
  }

  if (hasUpdates) {
    saveLastAnnouncements(state);
    console.log("Announcement database synced.");
  }
}
