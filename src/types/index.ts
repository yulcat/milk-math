export interface PumpingSession {
  id: string;
  date: string; // ISO date string
  startTime: string; // ISO datetime
  endTime?: string;
  durationSeconds?: number;
  leftMl: number;
  rightMl: number;
  totalMl: number;
  notes: string;
}

export interface StashBag {
  id: string;
  datePumped: string; // ISO date string
  dateAdded: string; // ISO datetime
  volumeMl: number;
  location: 'freezer' | 'fridge';
  notes: string;
  used: boolean;
  usedDate?: string;
}

export interface ConsumptionEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  baby: 'baby1' | 'baby2'; // 아둥이 / 바둥이
  breastMilkMl: number;
  formulaMl: number;
  notes: string;
  time: string; // HH:mm
}

export type TabId = 'pumping' | 'stash' | 'dashboard';

export interface DailyStats {
  date: string;
  totalPumped: number;
  totalBreastMilkConsumed: number;
  totalFormulaConsumed: number;
  totalConsumed: number;
}
