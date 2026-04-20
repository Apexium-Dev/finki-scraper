import { Page } from "puppeteer";
import {
  IGNORED_IDS,
  getSavedCourses,
  saveCourses,
  Course,
} from "../services/courses";

export async function scrapeCourses(page: Page) {
  await page.goto("https://courses.finki.ukim.mk/my/courses.php", {
    waitUntil: "networkidle2",
  });

  try {
    // Wait for actual course links to appear (not skeleton loaders)
    console.log("[INFO] Waiting for courses to load...");
    await page.waitForFunction(
      () => {
        const courseLinks = Array.from(
          document.querySelectorAll(".course-listitem a"),
        ).filter(
          (a) => a.textContent?.trim() && !a.className.includes("pulse"),
        );
        return courseLinks.length > 0;
      },
      { timeout: 15000 },
    );

    console.log("[INFO] Courses loaded successfully");

    // Add extra wait for dynamic content using delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const debugSelectors = await page.evaluate(() => {
      return {
        courseListItems: document.querySelectorAll(".course-listitem").length,
        courseCards: document.querySelectorAll(".course-card").length,
        courseInfo: document.querySelectorAll(".course-info").length,
        allDivs: document.querySelectorAll("div[data-course-id]").length,
        courseLinks: document.querySelectorAll("a.coursename").length,
        pageContent: document.body.innerText.substring(0, 200),
      };
    });

    console.log("[DEBUG] Page selectors found:", debugSelectors);

    // Try multiple selectors
    let courseSelector = ".course-listitem";
    let courseCount = await page.evaluate(
      (sel) => document.querySelectorAll(sel).length,
      courseSelector,
    );

    if (courseCount === 0) {
      console.log("[INFO] Trying alternative selectors...");
      const alternatives = [
        ".course-card",
        "[data-course-id]",
        ".course-item",
        ".coursebox",
      ];
      for (const alt of alternatives) {
        const count = await page.evaluate(
          (sel) => document.querySelectorAll(sel).length,
          alt,
        );
        console.log(`  [${alt}]: ${count} found`);
        if (count > 0) {
          courseSelector = alt;
          courseCount = count;
          break;
        }
      }
    }

    if (courseCount === 0) {
      console.log(
        "[WARNING] No courses found with any selector. Taking a screenshot...",
      );
      await page.screenshot({ path: "debug-screenshot.png" });
      console.log("Screenshot saved to debug-screenshot.png");
      return;
    }

    console.log(
      `[INFO] Using selector "${courseSelector}" - found ${courseCount} courses`,
    );

    const allCoursesLink = await page.$$eval(".course-listitem", (items) => {
      return items
        .map((div) => {
          // Look for any link that has course info
          const link = div.querySelector(
            "a[href*='/course/view.php']",
          ) as HTMLAnchorElement;

          if (!link) return null;

          const courseData = {
            id: new URL(link.href).searchParams.get("id") || "",
            name: link?.textContent?.trim().replace(/\s\s+/g, " ") || "Unknown",
            url: link?.href || "",
          };

          return courseData;
        })
        .filter((c) => c !== null && c.url);
    });

    // Filter by semester based on current month FIRST
    const now = new Date();
    const month = now.getMonth(); // 0 = January, 11 = December

    // Зимски (winter): September (8) to February (1) - courses end with /Z or contain "Зимски"
    // Летен (summer): March (2) to August (7) - courses end with /L or contain "Летен"
    let semesterMarker: string;
    let semesterName: string;
    if (month >= 8 || month <= 1) {
      semesterMarker = "Z";
      semesterName = "зимски (Winter)";
      console.log(
        "[INFO] Current semester: зимски (Winter) - filtering courses with /Z...",
      );
    } else {
      semesterMarker = "L";
      semesterName = "летен (Summer)";
      console.log(
        "[INFO] Current semester: летен (Summer) - filtering courses with /L...",
      );
    }

    console.log(
      `[DEBUG] All ${allCoursesLink.length} courses:`,
      allCoursesLink.map((c) => c.name),
    );

    // Filter by semester first
    let semesterCourses = allCoursesLink.filter((course) => {
      const upperName = course.name.toUpperCase();
      const matches =
        upperName.endsWith("/" + semesterMarker) ||
        upperName.includes("/" + semesterMarker);
      return matches;
    });

    console.log(
      `[DEBUG] ${semesterCourses.length} courses found for ${semesterName}:`,
      semesterCourses.map((c) => c.name),
    );

    // Then keep only the last 6 from the filtered courses
    let coursesLink = semesterCourses.slice(-6);
    console.log(
      `Found ${coursesLink.length} courses for ${semesterName}: ${coursesLink.map((c) => c.name).join(", ")}`,
    );

    let savedCourses = getSavedCourses();

    for (const course of coursesLink) {
      if (IGNORED_IDS.includes(course.id)) {
        console.log(`[SKIP] ${course.name} - in ignored list`);
        continue;
      }

      const exists = savedCourses.find((c) => c.id === course.id);
      if (exists) {
        console.log(`[SKIP] ${course.name} - already saved`);
        continue;
      }

      console.log(`Processing: ${course.name}`);

      try {
        await page.goto(course.url, { waitUntil: "networkidle2" });

        const announcementUrl = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll("a.aalink"));
          const found = anchors.find((a: any) => {
            const innerText = a.innerText || "";
            const instanceName =
              a.querySelector(".instancename")?.textContent || "";
            return /Announcements|Forum/i.test(innerText + instanceName);
          });

          // If not found with aalink, try other selectors
          if (!found) {
            const allLinks = Array.from(document.querySelectorAll("a"));
            const altFound = allLinks.find((a: any) => {
              const text = (a.textContent || "").toLowerCase();
              return text.includes("announcement") || text.includes("forum");
            });
            return altFound ? (altFound as HTMLAnchorElement).href : null;
          }

          return found ? (found as HTMLAnchorElement).href : null;
        });

        if (announcementUrl) {
          savedCourses.push({
            id: course.id,
            name: course.name,
            announcement: announcementUrl,
          });
          console.log(`[SUCCESS] Saved announcement URL for ${course.name}`);
        } else {
          console.log(`[WARNING] No announcements found for ${course.name}`);
        }
      } catch (err) {
        console.error(
          `[ERROR] Failed to process ${course.name}:`,
          (err as Error).message,
        );
      }
    }

    saveCourses(savedCourses);
    console.log("Sync complete.");
  } catch (err) {
    console.error("Scraper failed:", err);
  }
}
