import { Page } from "puppeteer";
const { PdfReader } = require("pdfreader");
import { saveExamResult } from "./results";

export async function parsePdfWithPage(
  page: Page,
  url: string,
): Promise<string> {
  try {
    const pdfBuffer = await page.evaluate(async (pdfUrl) => {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("Не успеа преземањето на PDF-от");
      const arrayBuffer = await response.arrayBuffer();
      return Array.from(new Uint8Array(arrayBuffer));
    }, url);

    const buffer = Buffer.from(pdfBuffer);

    return new Promise((resolve, reject) => {
      let content = "";
      new PdfReader().parseBuffer(buffer, (err: any, item: any) => {
        if (err) {
          reject(err);
        } else if (!item) {
          resolve(content.trim());
        } else if (item.text) {
          content += item.text + " ";
        }
      });
    });
  } catch (err) {
    console.error("Грешка при читање на PDF:", err);
    return "";
  }
}

export function findMultipleIndices(text: string, indices: string[]) {
  const results = [];

  for (const index of indices) {
    const cleanIndex = index.trim();
    const indexPos = text.indexOf(cleanIndex);

    if (indexPos !== -1) {
      const start = Math.max(0, indexPos - 80);
      const end = Math.min(text.length, indexPos + 80);
      const context = text.substring(start, end).replace(/\s+/g, " ");

      const timeMatch = context.match(/(\d{1,2}:\d{2})/);
      const foundTime = timeMatch ? timeMatch[1] : "Не е најдено";

      const roomPatterns = [
        /(\d{1,3}\s*[а-гa-g]{1,2})\b/i,
        /(?:лаб|lab|сала|sala|room|барака|амфи|предавална|просторија)\s*([\d]{1,3}|Б[\d\.]+)/i,
        /(Б[\d\.]+)/i,
        /\b([1-3][\d]{2})\b/,
      ];

      let foundRoom = "Не е најдена";
      for (const pattern of roomPatterns) {
        const match = context.match(pattern);
        if (match) {
          foundRoom = (match[1] || match[0]).replace(/\s+/g, "").toUpperCase();
          break;
        }
      }

      results.push({
        index: cleanIndex,
        found: true,
        room: foundRoom,
        time: foundTime,
      });
    } else {
      results.push({ index: cleanIndex, found: false });
    }
  }

  for (const res of results) {
    if (res.found && res.room !== "Не е најдена") {
      saveExamResult(res);
    }
  }

  return results;
}
