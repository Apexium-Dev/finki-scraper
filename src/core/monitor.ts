import { Page } from "puppeteer";
import { getSavedCourses } from "../services/courses";
import { getLastAnnouncements, saveLastAnnouncements } from "./announcements";
import { parsePdfWithPage, findMultipleIndices } from "../services/pdf-parser";
import {
  saveGeneralAnnouncement,
  saveGradeResult,
  saveExamResult,
} from "../services/results";

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
      console.log(`[CHECKING] ${course.name}...`);
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
        console.log(`[NEW POST] [${course.name}] ${latest.title}`);

        await page.goto(latest.link, { waitUntil: "networkidle2" });

        const postData = await page.evaluate(() => {
          const contentElement = document.querySelector(
            ".post-content-container",
          );
          if (!contentElement)
            return {
              text: "",
              links: [],
              debug: "No .post-content-container found",
            };

          const textContent = (contentElement as HTMLElement).innerText.trim();

          // Get links from inside the post content container
          const contentLinks = Array.from(
            contentElement.querySelectorAll("a"),
          ).map((a) => ({
            href: (a as HTMLAnchorElement).href,
            text: (a as HTMLElement).innerText.trim(),
          }));

          // Also get ALL PDF/pluginfile links from the entire page (they might be in attachments section)
          const allPageLinks = Array.from(
            document.querySelectorAll("a[href*='pluginfile'], a[href*='.pdf']"),
          )
            .map((a) => ({
              href: (a as HTMLAnchorElement).href,
              text: (a as HTMLElement).innerText.trim(),
            }))
            .filter((l) => !l.href.includes("download.moodle.org")); // exclude moodle app download link

          // Combine both lists and deduplicate by href
          const allLinks = Array.from(
            new Map(
              [...contentLinks, ...allPageLinks].map((l) => [l.href, l]),
            ).values(),
          );

          const hasPDFWord =
            textContent.toLowerCase().includes("pdf") ||
            textContent.toLowerCase().includes("прилог");

          return {
            text: textContent,
            links: allLinks,
            debug: `Content links: ${contentLinks.length}, Page PDF links: ${allPageLinks.length}, Combined: ${allLinks.length}, hasPDF: ${hasPDFWord}`,
          };
        });

        console.log(`[DEBUG_EVAL] ${postData.debug}`);

        saveGeneralAnnouncement({
          course: course.name,
          title: latest.title,
          content: postData.text,
          link: latest.link,
        });

        const isGrades =
          /резултати|оцени|поени|тест|испит|колоквиум|оценка|rezultati|oceni|points|test|grade/i.test(
            latest.title,
          );
        const isSchedule =
          /распоред|полагање|испит|колоквиум|raspored|polaganje/i.test(
            latest.title,
          );

        if (isSchedule || isGrades) {
          console.log(
            `[ANALYSIS] Scanning post text for indices: ${indicesToSearch.join(", ")}`,
          );
          for (const index of indicesToSearch) {
            if (postData.text.includes(index)) {
              console.log(
                `[MATCH] Found index ${index} directly in post content.`,
              );

              const startIdx = postData.text.indexOf(index);
              const contextSnippet = postData.text
                .substring(startIdx, startIdx + 100)
                .replace(/\n/g, " ");

              if (isGrades) {
                saveGradeResult({
                  timestamp: new Date().toLocaleString(),
                  course: course.name,
                  index: index,
                  points: "Check text content",
                  fullRow: contextSnippet,
                  link: latest.link,
                });
              } else {
                saveExamResult({
                  course: course.name,
                  index: index,
                  room: "See text",
                  time: "See text",
                });
              }
            }
          }

          const pdfLinks = postData.links.filter(
            (l) =>
              l.href.toLowerCase().includes(".pdf") ||
              l.href.toLowerCase().includes("pluginfile") ||
              l.href.toLowerCase().includes("/resource/"),
          );
          const keywordLinks = postData.links.filter((l) => {
            const text = l.text.toLowerCase();
            const href = l.href.toLowerCase();
            return (
              /резултати|оцени|овде|тука|results|here|линк|link|attachment|прилог|download/i.test(
                text,
              ) ||
              href.includes("pluginfile") ||
              href.includes("download")
            );
          });

          const allPotentialLinks = Array.from(
            new Set([
              ...pdfLinks.map((l) => l.href),
              ...keywordLinks.map((l) => l.href),
            ]),
          ).filter((l) => l && l.length > 0);

          console.log(
            `[DEBUG] PDF links: ${pdfLinks.length}, Keyword links: ${keywordLinks.length}, Total: ${allPotentialLinks.length}`,
          );
          console.log(
            `[INFO] Found ${allPotentialLinks.length} potential links for deep scanning.`,
          );

          for (const link of allPotentialLinks) {
            try {
              console.log(`[PDF_SCAN] Processing file: ${link}`);
              const pdfText = await parsePdfWithPage(page, link);

              if (pdfText && pdfText.length > 20) {
                const results = findMultipleIndices(
                  pdfText,
                  indicesToSearch,
                  course.name,
                  isGrades,
                );
                if (results.length > 0) {
                  console.log(
                    `[SUCCESS] Found match in file for indices: ${indicesToSearch.join(", ")}`,
                  );
                }
              }
            } catch (err) {
              console.error(`[SKIP] Error processing link ${link}`);
            }
          }
        }

        state[course.id] = {
          id: latest.id,
          title: latest.title,
          link: latest.link,
          date_checked: new Date().toLocaleString(),
        };
        hasUpdates = true;
      }
    } catch (err: any) {
      console.error(`[ERROR] ${course.name}:`, err.message);
    }
  }

  if (hasUpdates) {
    saveLastAnnouncements(state);
    console.log("[SYNC] Announcement state updated successfully.");
  }
}
