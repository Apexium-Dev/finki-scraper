import { Page } from "puppeteer";
import { getSavedCourses } from "../services/courses";
import { getLastAnnouncements, saveLastAnnouncements } from "./announcements";

export async function monitorAnnouncements(page: Page) {
  const courses = getSavedCourses();
  const state = getLastAnnouncements();
  let hasUpdates = false;

  for (const course of courses) {
    if (!course.announcement) continue;

    try {
      await page.goto(course.announcement, { waitUntil: "networkidle2" });

      const latest = await page.evaluate(() => {
        const row = document.querySelector("tr.discussion");
        if (!row) return null;

        const linkElement = row.querySelector(".topic a") as HTMLAnchorElement;
        const url = new URL(linkElement.href);

        return {
          id: url.searchParams.get("d") || "",
          title: linkElement.innerText.trim(),
          link: linkElement.href,
        };
      });

      if (!latest) continue;

      const previous = state[course.id];

      if (!previous || previous.id !== latest.id) {
        console.log(`New post: ${course.name} - ${latest.title}`);

        state[course.id] = {
          id: latest.id,
          title: latest.title,
          link: latest.link,
        };
        hasUpdates = true;
      }
    } catch (err) {
      console.error(`Error: ${course.name}`);
    }
  }

  if (hasUpdates) {
    saveLastAnnouncements(state);
    console.log("Database updated.");
  }
}
