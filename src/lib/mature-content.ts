const STORAGE_KEY = "anitracker-mature-content";

export function getMatureContent(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setMatureContent(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // ignore write failures (private mode, etc.)
  }
}
