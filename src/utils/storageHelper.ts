import { Employee, Prize, WinningRecord, AbsentRecord, DonationRecord, AppSettings, RepeatWinningMode } from '../types';

export const STORAGE_SNAPSHOT_KEY = 'gala_draw_session_snapshot_v1';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  activityTitle: '2026 聯歡晚會 • 喜慶年終大抽獎',
  drawDurationSeconds: 3.2,
  celebrationEffect: 'random',
};

export interface StorageSnapshotData {
  version: string;
  savedAt: number;
  settings?: AppSettings;
  employees: Employee[];
  prizes: Prize[];
  winningRecords: WinningRecord[];
  absentRecords: AbsentRecord[];
  donationRecords?: DonationRecord[];
  currentPool: 'main' | 'bonus';
  selectedPrizeId: string;
  allowRepeatWinning: boolean;
  repeatWinningMode?: RepeatWinningMode;
  acknowledgedRound?: number;
  autoBackupOnDraw?: boolean;
}

/**
 * Saves current draw session state to localStorage as a safety snapshot
 */
export function saveStorageSnapshot(data: StorageSnapshotData): boolean {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_SNAPSHOT_KEY, serialized);
    return true;
  } catch (err) {
    console.warn('Failed to save session snapshot to localStorage:', err);
    return false;
  }
}

/**
 * Retrieves existing snapshot from localStorage if present
 */
export function getStorageSnapshot(): StorageSnapshotData | null {
  try {
    const raw = localStorage.getItem(STORAGE_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StorageSnapshotData;
    if (parsed && Array.isArray(parsed.employees) && Array.isArray(parsed.prizes)) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('Failed to read session snapshot from localStorage:', err);
    return null;
  }
}

/**
 * Securely wipes all draw data from localStorage and returns confirmation
 */
export function clearStorageSnapshot(): boolean {
  try {
    localStorage.removeItem(STORAGE_SNAPSHOT_KEY);
    return true;
  } catch (err) {
    console.warn('Failed to clear session snapshot from localStorage:', err);
    return false;
  }
}

/**
 * Downloads a backup JSON file of the current state
 */
export function downloadStateAsJson(data: StorageSnapshotData, filenamePrefix = 'gala_draw_backup') {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const timeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    a.href = url;
    a.download = `${filenamePrefix}_${timeStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error downloading JSON backup:', err);
  }
}

export interface ValidateJsonBackupResult {
  success: boolean;
  data?: StorageSnapshotData;
  error?: string;
  stats?: {
    employeesCount: number;
    prizesCount: number;
    winnersCount: number;
    absenteesCount: number;
    donationsCount: number;
    savedAt?: number;
    activityTitle?: string;
  };
}

/**
 * Validates and sanitizes JSON backup file string content
 */
export function validateJsonBackupContent(jsonText: string): ValidateJsonBackupResult {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'JSON 內容格式錯誤：根節點非有效物件。' };
    }

    if (!Array.isArray(parsed.employees)) {
      return { success: false, error: '備份檔結構不符合：缺少同仁名冊陣列 (employees)。' };
    }

    if (!Array.isArray(parsed.prizes)) {
      return { success: false, error: '備份檔結構不符合：缺少獎項清單陣列 (prizes)。' };
    }

    const sanitizedData: StorageSnapshotData = {
      version: parsed.version || '1.0.0',
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      settings: parsed.settings ? {
        activityTitle: parsed.settings.activityTitle || DEFAULT_APP_SETTINGS.activityTitle,
        drawDurationSeconds: typeof parsed.settings.drawDurationSeconds === 'number' ? parsed.settings.drawDurationSeconds : DEFAULT_APP_SETTINGS.drawDurationSeconds,
        celebrationEffect: parsed.settings.celebrationEffect || DEFAULT_APP_SETTINGS.celebrationEffect,
      } : undefined,
      employees: parsed.employees,
      prizes: parsed.prizes,
      winningRecords: Array.isArray(parsed.winningRecords) ? parsed.winningRecords : [],
      absentRecords: Array.isArray(parsed.absentRecords) ? parsed.absentRecords : [],
      donationRecords: Array.isArray(parsed.donationRecords) ? parsed.donationRecords : [],
      currentPool: parsed.currentPool === 'bonus' ? 'bonus' : 'main',
      selectedPrizeId: parsed.selectedPrizeId || (parsed.prizes[0]?.id ?? ''),
      allowRepeatWinning: parsed.allowRepeatWinning !== undefined ? Boolean(parsed.allowRepeatWinning) : true,
      repeatWinningMode: parsed.repeatWinningMode === 'unlimited' ? 'unlimited' : parsed.repeatWinningMode === 'none' ? 'none' : 'fair_round',
      acknowledgedRound: typeof parsed.acknowledgedRound === 'number' ? parsed.acknowledgedRound : 1,
    };

    return {
      success: true,
      data: sanitizedData,
      stats: {
        employeesCount: sanitizedData.employees.length,
        prizesCount: sanitizedData.prizes.length,
        winnersCount: sanitizedData.winningRecords.length,
        absenteesCount: sanitizedData.absentRecords.length,
        donationsCount: sanitizedData.donationRecords?.length || 0,
        savedAt: sanitizedData.savedAt,
        activityTitle: sanitizedData.settings?.activityTitle,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `JSON 解析失敗：${msg}` };
  }
}

/**
 * Parses an uploaded backup JSON file to restore state
 */
export async function parseJsonBackupFile(file: File): Promise<StorageSnapshotData | null> {
  try {
    const text = await file.text();
    const res = validateJsonBackupContent(text);
    return res.success ? (res.data || null) : null;
  } catch (err) {
    console.error('Failed to parse backup JSON file:', err);
    return null;
  }
}
