import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "../../data");
const ALL_ANNOUNCEMENTS_FILE = path.join(DATA_DIR, "all_announcements.json");
const EXAM_RESULTS_FILE = path.join(DATA_DIR, "results.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export function saveGeneralAnnouncement(announcement: any) {
  let data = [];
  if (fs.existsSync(ALL_ANNOUNCEMENTS_FILE)) {
    data = JSON.parse(fs.readFileSync(ALL_ANNOUNCEMENTS_FILE, "utf-8") || "[]");
  }
  data.push({ timestamp: new Date().toLocaleString(), ...announcement });
  fs.writeFileSync(ALL_ANNOUNCEMENTS_FILE, JSON.stringify(data, null, 2));
}

export function saveExamResult(result: any) {
  let results = [];
  if (fs.existsSync(EXAM_RESULTS_FILE)) {
    results = JSON.parse(fs.readFileSync(EXAM_RESULTS_FILE, "utf-8") || "[]");
  }
  const exists = results.some(
    (r: any) =>
      r.index === result.index &&
      r.room === result.room &&
      r.time === result.time,
  );
  if (!exists) {
    results.push({ timestamp: new Date().toLocaleString(), ...result });
    fs.writeFileSync(EXAM_RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`[DATA] Result saved for index ${result.index}`);
  }
}
