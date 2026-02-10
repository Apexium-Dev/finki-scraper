import fs from "fs";

const ANNOUNCEMENTS_FILE = "./data/announcements.json";

export interface LastAnnouncement {
  [courseId: string]: {
    id: string;
    title: string;
    link: string;
    date_checked?: string;
    [key: string]: any;
  };
}

export function getLastAnnouncements(): LastAnnouncement {
  if (!fs.existsSync(ANNOUNCEMENTS_FILE)) {
    fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify({}));
    return {};
  }
  const data = fs.readFileSync(ANNOUNCEMENTS_FILE, "utf-8");
  return data.trim() ? JSON.parse(data) : {};
}

export function saveLastAnnouncements(data: LastAnnouncement) {
  fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(data, null, 2));
}
