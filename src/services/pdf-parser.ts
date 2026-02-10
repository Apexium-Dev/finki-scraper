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
    console.error("[PDF_PARSE_ERROR]", err);
    return "";
  }
}

export function findMultipleIndices(
  text: string,
  indices: string[],
  courseName: string,
  isGradeCheck: boolean,
): any[] {
  const cleanText = text.replace(/\s\s+/g, " ");
  const results: any[] = [];

  const headerKeywords = [
    "Индекс",
    "Index",
    "Име",
    "Points",
    "Вкупно",
    "Total",
  ];
  let tableHeader = "Не е најдено заглавие";

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
    const indexPos = cleanText.indexOf(cleanIndex);

    if (indexPos !== -1) {
      let context = cleanText.substring(
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
            points: maxPoints.toString(), // Најголемата бројка (Вкупно поени)
            grade: lastVal, // Последната бројка (веројатно Оцена)
          };

          saveGradeResult(resultObj);
          results.push(resultObj);
        }
      } else {
        const roomMatch =
          context.match(/(?:лаб|сала|lab|room)\s*([A-Z0-9.\/]+)/i) ||
          context.match(/\s+([1-2][0-9]{2}[a-z]?)/i);
        const timeMatch = context.match(/([0-1]?[0-9]:[0-5][0-9])/);

        const found = {
          index: cleanIndex,
          room: roomMatch ? roomMatch[1] : "N/A",
          time: timeMatch ? timeMatch[1] : "N/A",
        };

        saveExamResult({ course: courseName, ...found });
        results.push(found);
      }
    }
  }
  return results;
}
