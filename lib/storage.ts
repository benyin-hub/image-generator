import { HistoryItem, Style } from "./types";

const STYLES_KEY = "iag.styles.v1";
const HISTORY_KEY = "iag.history.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to persist ${key}`, err);
  }
}

export function loadStyles(): Style[] {
  return readJson<Style[]>(STYLES_KEY, []);
}

export function saveStyles(styles: Style[]): void {
  writeJson(STYLES_KEY, styles);
}

export function loadHistory(): HistoryItem[] {
  return readJson<HistoryItem[]>(HISTORY_KEY, []);
}

export function saveHistory(history: HistoryItem[]): void {
  writeJson(HISTORY_KEY, history);
}
