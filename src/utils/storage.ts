import type { PumpingSession, StashBag, ConsumptionEntry } from '../types';

const KEYS = {
  sessions: 'milkmath_sessions',
  stash: 'milkmath_stash',
  consumption: 'milkmath_consumption',
  darkMode: 'milkmath_darkMode',
} as const;

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Pumping Sessions
export function getSessions(): PumpingSession[] {
  return load<PumpingSession>(KEYS.sessions);
}

export function saveSessions(sessions: PumpingSession[]): void {
  save(KEYS.sessions, sessions);
}

export function addSession(session: PumpingSession): void {
  const sessions = getSessions();
  sessions.push(session);
  saveSessions(sessions);
}

export function deleteSession(id: string): void {
  saveSessions(getSessions().filter(s => s.id !== id));
}

// Stash
export function getStash(): StashBag[] {
  return load<StashBag>(KEYS.stash);
}

export function saveStash(stash: StashBag[]): void {
  save(KEYS.stash, stash);
}

export function addStashBag(bag: StashBag): void {
  const stash = getStash();
  stash.push(bag);
  saveStash(stash);
}

export function updateStashBag(bag: StashBag): void {
  const stash = getStash();
  const idx = stash.findIndex(b => b.id === bag.id);
  if (idx >= 0) stash[idx] = bag;
  saveStash(stash);
}

export function deleteStashBag(id: string): void {
  saveStash(getStash().filter(b => b.id !== id));
}

// Consumption
export function getConsumption(): ConsumptionEntry[] {
  return load<ConsumptionEntry>(KEYS.consumption);
}

export function saveConsumption(entries: ConsumptionEntry[]): void {
  save(KEYS.consumption, entries);
}

export function addConsumption(entry: ConsumptionEntry): void {
  const entries = getConsumption();
  entries.push(entry);
  saveConsumption(entries);
}

export function deleteConsumption(id: string): void {
  saveConsumption(getConsumption().filter(e => e.id !== id));
}

// Dark Mode
export function getDarkMode(): boolean {
  const val = localStorage.getItem(KEYS.darkMode);
  if (val !== null) return val === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function setDarkMode(dark: boolean): void {
  localStorage.setItem(KEYS.darkMode, String(dark));
}

// Export / Import
export function exportAllData(): string {
  return JSON.stringify({
    milkmath_sessions: getSessions(),
    milkmath_stash: getStash(),
    milkmath_consumption: getConsumption(),
    exportDate: new Date().toISOString(),
  }, null, 2);
}

export function importAllData(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (data.milkmath_sessions) saveSessions(data.milkmath_sessions);
    if (data.milkmath_stash) saveStash(data.milkmath_stash);
    if (data.milkmath_consumption) saveConsumption(data.milkmath_consumption);
    return true;
  } catch {
    return false;
  }
}
