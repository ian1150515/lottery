export type CelebrationEffectType = 
  | 'random' 
  | 'streamers' 
  | 'golden_stars' 
  | 'fireworks' 
  | 'festive_rain' 
  | 'whirlwind';

export interface AppSettings {
  activityTitle: string;         // 本次抽獎標題名稱
  drawDurationSeconds: number;   // 按下抽獎後到結果揭曉的等待/轉動時間（秒數）
  celebrationEffect: CelebrationEffectType; // 多元中獎特效
}

export interface Employee {
  id: string;
  empNo: string;
  name: string;
  department: string;
  isAbsent?: boolean;
}

export type DrawMethodType = 'step' | 'batch'; // 'step' = 逐次抽出, 'batch' = 一次抽出

// 重複中獎模式：'none' = 一人一獎, 'fair_round' = 平準輪次(每人每輪限1次，全部滿才開下一輪), 'unlimited' = 自由重複無上限
export type RepeatWinningMode = 'none' | 'fair_round' | 'unlimited';

export interface Prize {
  id: string;
  name: string;         // 獎項（例如：特獎、頭獎、二獎、普獎）
  content: string;      // 獎品名稱（例如：iPhone 16 Pro、Dyson吹風機）
  quota: number;        // 數量（該獎項可抽出的總名額）
  order: number;
  image?: string;       // 獎品圖片（支援圖檔上傳與預覽，Base64 或圖片網址）
  isAdditional?: boolean; // 現場動態追加獎項標註 (加碼池獎項)
  poolType?: 'main' | 'bonus'; // 獎池區隔：正規池 vs 加碼池
  allowRepeat?: boolean;  // 是否允許重複中獎
  drawRule?: string;    // 抽獎規則（例如：一人一獎 (排除已中獎者)、全員皆可重複）
  drawMethod?: DrawMethodType; // 抽獎方式：'step' (逐次抽出) | 'batch' (一次抽出)
}

export interface WinningRecord {
  id: string;
  prizeId: string;
  prizeName: string;
  prizeContent: string;
  prizeImage?: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  department: string;
  timestamp: number;
  isAdditional?: boolean;
  poolType?: 'main' | 'bonus'; // 記錄屬於正規池或加碼池
  replacesAbsenteeId?: string; // 若為唱名放棄補抽，記錄原缺席者
}

export interface AbsentRecord {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  department: string;
  prizeId: string;
  prizeName: string;
  poolType?: 'main' | 'bonus'; // 棄權所屬獎池：正規池 vs 加碼池 (正規池棄權不影響加碼池抽獎資格)
  timestamp: number;
  reason: string;
}

export interface DonationRecord {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  department: string;
  prizeId: string;
  prizeName: string;
  prizeContent: string;
  fromPool: 'main' | 'bonus';
  targetPool: 'bonus' | 'current';
  createdBonusPrizeId?: string;
  timestamp: number;
  note?: string;
}

export interface DrawSessionSnapshot {
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
}

