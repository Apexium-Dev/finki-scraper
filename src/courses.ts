import fs from "fs";

export const COURSES_FILE = "./data/courses.json";

export const IGNORED_IDS = ["263", "1663"];

export interface Course {
  id: string;
  name: string;
  announcement: string;
}

export function getSavedCourses(): Course[] {
  if (!fs.existsSync("./data")) fs.mkdirSync("./data");
  if (!fs.existsSync(COURSES_FILE)) {
    fs.writeFileSync(COURSES_FILE, JSON.stringify([]));
    return [];
  }
  const data = fs.readFileSync(COURSES_FILE, "utf-8");
  return JSON.parse(data);
}

export function saveCourses(courses: Course[]) {
  fs.writeFileSync(COURSES_FILE, JSON.stringify(courses, null, 2));
}
