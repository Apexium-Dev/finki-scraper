import { Page } from "puppeteer";
const { PdfReader } = require("pdfreader");
import { saveExamResult, saveGradeResult } from "./results";

export async function parsePdfWithPage(
  page: Page,
  url: string,
): Promise<string> {
  try {
    const pdfBuffer = await page.evaluate(async (pdfUrl) => {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("Failed to download PDF");
      const arrayBuffer = await response.arrayBuffer();
      return Array.from(new Uint8Array(arrayBuffer));
    }, url);

    const buffer = Buffer.from(pdfBuffer);

    return new Promise((resolve, reject) => {
      let content = "";
      new PdfReader().parseBuffer(buffer, (err: any, item: any) => {
        if (err) reject(err);
        else if (!item) resolve(content.trim());
        else if (item.text) content += item.text + " ";
      });
    });
  } catch (err) {
    console.error("[ERROR] PDF Parse Failure:", err);
    return "";
  }
}

export function findMultipleIndices(
  text: string,
  indices: string[],
  courseName: string,
  isGradeCheck: boolean,
): any[] {
  let cleanText = text.replace(/\s\s+/g, " ");

  // Also try removing spaces between digits to catch spaced-out numbers
  const compactText = cleanText.replace(/(\d)\s+(?=\d)/g, "$1");

  const results: any[] = [];

  console.log(
    `[DEBUG] Searching for indices in ${courseName}: ${indices.join(", ")}`,
  );

  const headerKeywords = [
    "Index",
    "Points",
    "Total",
    "Grade",
    "Status",
    "Индекс",
    "Оцена",
  ];

  let tableHeader = "Header not found";

  for (const key of headerKeywords) {
    const foundIdx = cleanText.indexOf(key);
    if (foundIdx !== -1) {
      tableHeader = cleanText
        .substring(foundIdx, foundIdx + 200)
        .replace(/\b\d{6}\b.*/, "")
        .trim();
      break;
    }
  }

  for (const index of indices) {
    const cleanIndex = index.trim();

    // Try to find in both normal and compact text
    let indexPos = cleanText.indexOf(cleanIndex);
    let searchText = cleanText;

    if (indexPos === -1) {
      indexPos = compactText.indexOf(cleanIndex);
      searchText = compactText;
      if (indexPos !== -1) {
        console.log(
          `[DEBUG] Looking for index "${cleanIndex}" - found at position: ${indexPos} (in compact text)`,
        );
      }
    } else {
      console.log(
        `[DEBUG] Looking for index "${cleanIndex}" - found at position: ${indexPos}`,
      );
    }

    if (indexPos !== -1) {
      let context = searchText.substring(
        indexPos + cleanIndex.length,
        indexPos + 600,
      );

      const nextStudentMatch = context.match(/\b[1-2]\d{5}\b/);
      if (nextStudentMatch) {
        context = context.substring(0, nextStudentMatch.index);
      }

      if (isGradeCheck) {
        const allNumbers = context.match(/(\d{1,3}(?:[.,]\d{1,2})?)/g) || [];
        const dataPoints = allNumbers.filter(
          (num) => !cleanIndex.includes(num),
        );

        if (dataPoints.length > 0) {
          const numericValues = dataPoints.map((n) =>
            parseFloat(n.replace(",", ".")),
          );

          const maxPoints = Math.max(...numericValues);
          const lastVal = dataPoints[dataPoints.length - 1];

          const resultObj = {
            timestamp: new Date().toLocaleString(),
            course: courseName,
            index: cleanIndex,
            header: tableHeader,
            fullRow: dataPoints.join(" | "),
            points: maxPoints.toString(),
            grade: lastVal,
          };

          console.log(`[DEBUG] Saving grade result:`, resultObj);
          saveGradeResult(resultObj);
          results.push(resultObj);
        }
      } else {
        // Extract all numbers after the index (these are likely points/grades)
        const allNumbers = context.match(/(\d{1,3}(?:[.,]\d{1,2})?)/g) || [];
        const cleanNumbers = allNumbers.slice(0, 10); // Get first 10 numbers after index

        const roomMatch =
          context.match(
            /(?:lab|room|amfi|лаб|сала|амфитеатар)\s*([A-Z0-9.\/]+)/i,
          ) || context.match(/\b([1-2][0-9]{2}[a-z]?|[A-Z][0-9])\b/i);

        const timeMatch = context.match(/([0-1]?[0-9]:[0-5][0-9])/);

        const found = {
          index: cleanIndex,
          course: courseName,
          room: roomMatch ? roomMatch[1] : "N/A",
          time: timeMatch ? timeMatch[0] : "N/A",
          points: cleanNumbers.slice(0, 3).join(" / "),
          fullData: cleanNumbers.join(" | "),
        };

        console.log(`[DEBUG] Saving exam result:`, found);
        saveExamResult(found);
        results.push(found);
      }
    }
  }

  console.log(`[DEBUG] Total matches found: ${results.length}`);
  return results;
}
